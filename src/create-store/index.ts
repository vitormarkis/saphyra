import { Subject } from "../Subject"
import { createAsync } from "./createAsync"
import { defaultErrorHandler } from "./fn/default-error-handler"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  BaseAction,
  BaseState,
  CreateReducerInner,
  DefaultActions,
  GenericStore,
  InnerReducerSet,
  ReducerInner,
  ReducerInnerProps,
  ReducerSet,
  Setter,
  StoreErrorHandler,
  TODO,
  TransitionsExtension,
} from "./types"

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  initialProps: TInitialProps
  store: GenericStore<TState, TActions> & Record<string, any>
}

type OnConstruct<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = (props: OnConstructProps<TInitialProps, TState, TActions>, config?: StoreConstructorConfig) => TState

function defaultOnConstruct<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
>(props: OnConstructProps<TInitialProps, TState, TActions>, _config?: StoreConstructorConfig) {
  const state = props.initialProps as unknown as TState
  return state
}

//

/**
 * Reducer
 */
type ReducerProps<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  prevState: TState
  state: TState
  action: TActions
  store: GenericStore<TState, TActions> & Record<string, any>
  set: ReducerSet<TState>
  async: Async<TState>
}

type Reducer<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = (props: ReducerProps<TState, TActions>) => TState

function defaultReducer<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
>(props: ReducerProps<TState, TActions>) {
  return props.state
}

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  onConstruct?: OnConstruct<TInitialProps, TState>
  reducer?: Reducer<TState, TActions>
}

export type StoreConstructorConfig = {
  errorHandlers?: StoreErrorHandler[]
}

export function createStoreFactory<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
>(
  {
    onConstruct = defaultOnConstruct,
    reducer: userReducer = defaultReducer,
  }: CreateStoreOptions<TInitialProps, TState, TActions> = {} as CreateStoreOptions<
    TInitialProps,
    TState,
    TActions
  >
): (
  initialProps: TInitialProps,
  config?: StoreConstructorConfig
) => GenericStore<TState, TActions> & TransitionsExtension {
  const StoreClass = class Store extends Subject {
    transitions = new TransitionsStore()
    errorHandlers: Set<StoreErrorHandler>

    setStateCallbacks: Record<string, Array<(state: TState) => Partial<TState>>> = {}

    state: TState

    constructor(initialProps: TInitialProps, config: StoreConstructorConfig = {}) {
      super()
      const store = this as GenericStore<TState, TActions> & TransitionsExtension
      this.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])
      // @ts-expect-error // TODO
      this.state = onConstruct({ initialProps, store })
    }

    handleError(error: unknown) {
      this.errorHandlers.forEach(errorHandler => {
        errorHandler(error)
      })
    }

    registerErrorHandler(handler: StoreErrorHandler) {
      this.errorHandlers.add(handler)
      return () => this.errorHandlers.delete(handler)
    }

    registerSet: InnerReducerSet<TState> = (setter, currentState, transition, mergeType) => {
      const onDemandSetters: Setter<TState>[] = []

      if (transition) {
        const transitionKey = transition.join(":")
        this.setStateCallbacks[transitionKey] ??= []
        this.setStateCallbacks[transitionKey].push(setter)
      }

      // mutating the current new state so user
      // can have access to the future value
      // in the same function
      let newState = setter(currentState) as TState

      /**
       * Re-running the reducer since the promise onSuccess
       * callback only sets the state without running the reducer
       */
      if (mergeType === "reducer") {
        const store = this
        const reducer = this.createReducer({
          async: createAsync(store, newState, transition),
          prevState: currentState,
          set: setter => {
            onDemandSetters.push(setter)
            return store.registerSet(setter, newState, transition, "set")
          },
          store,
        })
        const processedState = reducer({
          action: { type: "noop" } as TActions,
          state: newState,
        })

        newState = {
          ...newState,
          ...processedState,
        }
      }

      for (const key in newState) {
        Object.assign(currentState as any, { [key]: newState[key] })
      }
    }

    setState(newState: Partial<TState>) {
      this.state = { ...this.state, ...newState }
      this.notify()
    }

    private applyTransition(transition: any[] | null | undefined) {
      if (!transition) {
        debugger
        throw new Error("No transition provided.")
      }
      const transitionKey = transition.join(":")
      const setters = this.setStateCallbacks[transitionKey]
      if (!setters) {
        debugger
        throw new Error("Impossible to reach this point")
      }
      this.setStateCallbacks[transitionKey] = []
      const newState = setters.reduce((acc: TState, setter) => ({ ...acc, ...setter(acc) }), this.state)
      this.state = newState
      // const store = this
      // this.state = userReducer({
      //   store,
      //   action: { type: "noop" } as TActions,
      //   prevState: this.state,
      //   async: createAsync(store, newState, transition),
      //   set: this.createSet(newState),
      //   state: newState,
      // })
      this.notify()
    }

    createSet(newState: TState & Partial<TState>, mergeType: "reducer" | "set" = "set"): ReducerSet<TState> {
      return setState => this.registerSet(setState, newState, null, mergeType)
    }

    createReducer({
      async,
      prevState,
      set,
      store,
    }: CreateReducerInner<TState, TActions>): ReducerInner<TState, TActions> {
      return function reducer({ action, state }: ReducerInnerProps<TState, TActions>): TState {
        return userReducer({
          action,
          prevState,
          async,
          set,
          state,
          store,
        })
      }
    }

    dispatch(action: TActions) {
      const newState = { ...this.state }

      const currentTransitionName = this.state.currentTransition?.join(":")
      const actionTransitionName = action.transition?.join(":")
      const isNewTransition = currentTransitionName !== actionTransitionName

      const store = this
      if (action.transition != null && isNewTransition) {
        newState.currentTransition = action.transition
        store.transitions.events.done.once(action.transition.join(":"), error => {
          if (!action.transition) throw new Error("Impossible to reach this point")
          if (error) {
            console.log(`%cTransition failed! [${action.transition.join(":")}]`, "color: red")
            store.handleError(error)
          } else {
            console.log(`%cTransition completed! [${action.transition.join(":")}]`, "color: lightgreen")
            store.applyTransition(action.transition)
          }
        })
      }

      const reducer = this.createReducer({
        async: createAsync(store, newState, action.transition),
        prevState: this.state,
        set: this.createSet(newState),
        store,
      })

      const processedState = reducer({
        action,
        state: newState,
      })
      if (action.transition == null) {
        this.state = processedState
        this.notify()
      } else {
        // the observers will be notified
        // when the transition is done
      }
    }
  }

  return (initialProps: TInitialProps, config: StoreConstructorConfig = {}) => {
    const Class = StoreClass
    return new Class(initialProps, config) as unknown as GenericStore<TState, TActions> & TransitionsExtension
  }
}
