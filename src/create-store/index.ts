import { createDiffOnKeyChange } from "../diff"
import { Subject } from "../Subject"
import { RemoveUnderscoreProps } from "../types"
import { createAsync } from "./createAsync"
import { defaultErrorHandler } from "./fn/default-error-handler"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  BaseAction,
  BaseState,
  CreateReducerInner,
  DefaultActions,
  Diff,
  GenericStore,
  InnerReducerSet,
  ReducerInner,
  ReducerInnerProps,
  ReducerSet,
  Setter,
  StoreErrorHandler,
  StoreInstantiator,
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
> = (
  props: OnConstructProps<TInitialProps, TState, TActions>,
  config: StoreConstructorConfig
) => RemoveUnderscoreProps<TState>

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
  diff: Diff<TState>
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
  notify: () => void
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
): StoreInstantiator<TInitialProps, GenericStore<TState, TActions> & TransitionsExtension> {
  type TStore = GenericStore<TState, TActions> & TransitionsExtension

  const StoreClass = class Store extends Subject {
    transitions = new TransitionsStore()
    errorHandlers: Set<StoreErrorHandler>

    setStateCallbacks: Record<string, Array<(state: TState) => Partial<TState>>> = {}

    state: TState

    constructor(
      initialProps: TInitialProps,
      config: StoreConstructorConfig = {
        notify: () => this.notify(),
      }
    ) {
      super()
      const store = this as unknown as TStore
      this.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])

      try {
        const initialState = onConstruct(
          // @ts-expect-error // TODO
          { initialProps, store },
          {
            notify: () => this.notify(),
          }
        ) as TState

        const prevState = {} as TState
        const reducer = store.createReducer({
          async: createAsync(store, initialState, ["bootstrap"]),
          set: this.createSet(initialState, "set", null),
          prevState,
          store,
        })

        const processedState = reducer({
          action: { type: "noop" } as TActions,
          state: initialState,
          diff: this.createDiff(prevState, initialState),
        })

        this.state = processedState
      } catch (error) {
        this.handleError(error)
        throw error
      }
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

    rerender() {
      const store = this
      const reducer = store.createReducer({
        async: createAsync(store, store.state, null),
        set: store.createSet(store.state, "set", null),
        store,
        prevState: store.state,
      })
      store.state = reducer({
        action: { type: "noop" } as TActions,
        diff: store.createDiff(store.state, store.state),
        state: store.state,
      })
      store.notify()
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
       *
       * re-running the reducer is what derives the states
       * and make sure the store state is always in a valid state
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
          diff: this.createDiff(currentState, newState),
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

    setState(newPartialState: Partial<TState>) {
      const store = this
      const newState = { ...this.state, ...newPartialState }
      const reducer = store.createReducer({
        store,
        prevState: store.state,
        async: createAsync(this, newState, null),
        set: store.createSet(newState, "set", null),
      })
      this.state = reducer({
        action: { type: "noop" } as TActions,
        diff: this.createDiff(store.state, newState),
        state: newState,
      })
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

    createSet(
      newState: TState & Partial<TState>,
      mergeType: "reducer" | "set" = "set",
      transition: any[] | null | undefined = null
    ): ReducerSet<TState> {
      return setState => this.registerSet(setState, newState, transition, mergeType)
    }

    createReducer({
      async,
      prevState,
      set,
      store,
    }: CreateReducerInner<TState, TActions>): ReducerInner<TState, TActions> {
      return function reducer({ action, state, diff }: ReducerInnerProps<TState, TActions>): TState {
        return userReducer({
          action,
          prevState,
          async,
          state,
          store,
          set,
          diff,
        })
      }
    }

    createDiff(oldState: TState, newState: TState) {
      const [, diff] = createDiffOnKeyChange(oldState, newState)
      return diff
    }

    dispatch(action: TActions) {
      const newState = { ...this.state }

      const currentTransitionName = this.state.currentTransition?.join(":")
      const actionTransitionName = action.transition?.join(":")
      const isNewTransition = currentTransitionName !== actionTransitionName

      const store = this
      if (action.transition != null && isNewTransition) {
        store.transitions.addKey(action.transition)
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
        set: this.createSet(newState, "set", action.transition),
        store,
      })

      const processedState = reducer({
        action,
        state: newState,
        diff: this.createDiff(this.state, newState),
      })
      if (action.transition == null) {
        this.state = processedState
        this.notify()
      } else {
        store.transitions.doneKey(action.transition, null)

        // the observers will be notified
        // when the transition is done
      }
    }
  }

  const storeInstantiator: StoreInstantiator<TInitialProps, TStore> = (
    initialProps: TInitialProps,
    config: StoreConstructorConfig = {} as StoreConstructorConfig
  ): TStore => {
    const Class = StoreClass
    return new Class(initialProps, config) as unknown as TStore
  }
  return storeInstantiator
}
