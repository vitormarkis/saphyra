import { createDiffOnKeyChange } from "../diff"
import { Subject } from "../Subject"
import { RemoveDollarSignProps } from "../types"
import { createAsync } from "./createAsync"
import { _noTransitionError } from "./errors"
import { defaultErrorHandler } from "./fn/default-error-handler"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  BaseAction,
  BaseState,
  CreateReducerInner,
  DefaultActions,
  Diff,
  Dispatch,
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
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  initialProps: TInitialProps
  store: GenericStore<TState, TActions> & Record<string, any>
}

type OnConstruct<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = (
  props: OnConstructProps<TInitialProps, TState, TActions>,
  config: StoreConstructorConfig
) => RemoveDollarSignProps<TState>

function defaultOnConstruct<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
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
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  prevState: TState
  state: TState
  action: TActions
  store: GenericStore<TState, TActions> & Record<string, any>
  set: ReducerSet<TState>
  async: Async<TState>
  diff: Diff<TState>
  dispatch: Dispatch<TState, TActions>
}

export type Reducer<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = (props: ReducerProps<TState, TActions>) => TState

function defaultReducer<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
>(props: ReducerProps<TState, TActions>) {
  return props.state
}

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
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
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
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
    history: Array<TState>
    historyRedo: Array<TState>
    transitions = new TransitionsStore()
    errorHandlers: Set<StoreErrorHandler>

    setStateCallbacks: Record<string, Array<(state: TState) => Partial<TState>>> = {}

    state: TState

    constructor(initialProps: TInitialProps, config: StoreConstructorConfig) {
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
          store,
          dispatch: (action: TActions) => {
            console.log("dispatch", action)
          },
        })

        const processedState = reducer({
          action: { type: "noop" } as TActions,
          state: initialState,
          diff: this.createDiff(prevState, initialState),
          async: createAsync(store, initialState, ["bootstrap"]),
          set: this.createSetScheduler(initialState, "set", null),
          prevState,
        })

        this.state = processedState
      } catch (error) {
        this.handleError(error)
        throw error
      }

      this.history = [this.state]
      this.historyRedo = []
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

    undo() {
      if (this.history.length <= 1) return
      this.historyRedo = [...this.historyRedo, this.history.pop()!]
      const previousState = this.history.at(-1)!
      if (!previousState) debugger
      this.state = { ...previousState }
      this.notify()
    }

    redo() {
      if (this.historyRedo.length <= 0) return
      this.history = [...this.history, this.historyRedo.pop()!]
      const nextState = this.history.at(-1)!
      this.state = { ...nextState }
      this.notify()
    }

    rerender() {
      const store = this
      const reducer = store.createReducer({
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })
      store.state = reducer({
        action: { type: "noop" } as TActions,
        diff: store.createDiff(store.state, store.state),
        state: store.state,
        async: createAsync(store, store.state, null),
        set: store.createSetScheduler(store.state, "set", null),
        prevState: store.state,
      })
      store.notify()
    }

    registerSet: InnerReducerSet<TState> = (setter, currentState, transition, mergeType) => {
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
          store,
          dispatch: (action: TActions) => {
            console.log("dispatch", action)
          },
        })
        const processedState = reducer({
          action: { type: "noop" } as TActions,
          state: newState,
          diff: this.createDiff(currentState, newState),
          set: this.createSetScheduler(newState, "set", transition),
          async: createAsync(store, newState, transition),
          prevState: currentState,
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
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })
      this.state = reducer({
        action: { type: "noop" } as TActions,
        diff: this.createDiff(store.state, newState),
        state: newState,
        prevState: store.state,
        async: createAsync(this, newState, null),
        set: store.createSetScheduler(newState, "set", null),
      })

      this.notify()
    }

    private applyTransition(transition: any[] | null | undefined, onTransitionEnd?: (state: TState) => void) {
      if (!transition) {
        debugger
        throw _noTransitionError
      }
      const transitionKey = transition.join(":")
      const setters = this.setStateCallbacks[transitionKey]
      if (!setters) {
        debugger
        throw new Error(
          "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
        )
      }
      this.setStateCallbacks[transitionKey] = []
      const newState = setters.reduce((acc: TState, setter) => {
        const newState = setter(acc)
        return { ...acc, ...newState }
      }, this.state)
      this.state = newState
      this.history.push(newState)
      this.historyRedo = []
      onTransitionEnd?.(newState)
      this.notify()
    }

    createSetScheduler(
      newState: TState & Partial<TState>,
      mergeType: "reducer" | "set" = "set",
      transition: any[] | null | undefined = null
    ): ReducerSet<TState> {
      return setState => this.registerSet(setState, newState, transition, mergeType)
    }

    createReducer({ store, dispatch }: CreateReducerInner<TState, TActions>): ReducerInner<TState, TActions> {
      return function reducer({
        async,
        set,
        action,
        prevState,
        state,
        diff,
      }: ReducerInnerProps<TState, TActions>): TState {
        return userReducer({
          action,
          prevState,
          async,
          state,
          store,
          diff,
          set,
          dispatch,
        })
      }
    }

    createDiff(oldState: TState, newState: TState) {
      const [, diff] = createDiffOnKeyChange(oldState, newState)
      return diff
    }

    private handleRegisterTransition(
      newState: TState,
      initialAction: TActions,
      store: GenericStore<TState, TActions> & TransitionsExtension
    ) {
      const currentTransitionName = this.state.currentTransition?.join(":")
      const actionTransitionName = initialAction.transition?.join(":")
      const isNewTransition = currentTransitionName !== actionTransitionName

      if (initialAction.transition != null && isNewTransition) {
        const transitionAlreadyRunning = store.transitions.get(initialAction.transition)
        store.transitions.addKey(initialAction.transition)
        newState.currentTransition = initialAction.transition
        if (!transitionAlreadyRunning) {
          store.transitions.events.done.once(initialAction.transition.join(":"), error => {
            if (!initialAction.transition) throw new Error("Impossible to reach this point")
            if (error) {
              console.log(`%cTransition failed! [${initialAction.transition.join(":")}]`, "color: red")
              store.handleError(error)
            } else {
              console.log(
                `%cTransition completed! [${initialAction.transition.join(":")}]`,
                "color: lightgreen"
              )
              this.applyTransition(initialAction.transition, initialAction.onTransitionEnd)
            }
          })
        }
      }
    }

    dispatch(initialAction: TActions) {
      const store = this
      let newState = { ...this.state }
      this.handleRegisterTransition(newState, initialAction, store)

      const actionsQueue: TActions[] = [initialAction]
      const reducer = this.createReducer({
        store,
        dispatch: (action: TActions) => {
          actionsQueue.push({
            ...action,
            transition: initialAction.transition ?? null,
          })
        },
      })

      let prevState = this.state
      for (const action of actionsQueue) {
        const scheduleSetter = this.createSetScheduler(newState, "set", action.transition)

        const futurePrevState = { ...newState }
        const context: ReducerInnerProps<TState, TActions> = {
          action,
          prevState: prevState,
          state: newState,
          async: createAsync(store, newState, action.transition),
          set: scheduleSetter,
          diff: this.createDiff(prevState, newState),
        }
        const producedState = reducer(context)
        // looks redundant but user might return prev state
        newState = producedState
        prevState = futurePrevState
      }

      if (initialAction.transition == null) {
        this.state = newState
        this.notify()
      } else {
        store.transitions.doneKey(initialAction.transition, null)
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
