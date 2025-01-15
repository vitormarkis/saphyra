import _ from "lodash"
import { createDiffOnKeyChange } from "../diff"
import { createSubject, Subject } from "../Subject"
import { RemoveDollarSignProps } from "../types"
import { createAsync } from "./createAsync"
import { _noTransitionError } from "./errors"
import { defaultErrorHandler } from "./fn/default-error-handler"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  BaseAction,
  BaseState,
  DefaultActions,
  Diff,
  Dispatch,
  GenericStoreMethods,
  GenericStoreValues,
  ReducerSet,
  SomeStore,
  StoreErrorHandler,
  StoreInstantiator,
} from "./types"
import { EventEmitter, EventsTuple } from "~/create-store/event-emitter"
import { isAsyncFunction } from "~/lib/utils"

export type ExternalProps = Record<string, any> | null

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  initialProps: TInitialProps
  store: SomeStore<TState, TActions, TEvents>
}

type OnConstruct<
  TInitialProps,
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = (
  props: OnConstructProps<TInitialProps, TState, TActions, TEvents>,
  config?: StoreConstructorConfig
) => RemoveDollarSignProps<TState> | Promise<RemoveDollarSignProps<TState>>

function defaultOnConstruct<
  TInitialProps,
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
>(props: OnConstructProps<TInitialProps, TState, TActions, TEvents>, _config?: StoreConstructorConfig) {
  const state = props.initialProps as unknown as TState
  return { ...state }
}

//

/**
 * Reducer
 */
type ReducerProps<
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  prevState: TState
  state: TState
  action: TActions
  async: Async<TState, TActions>
  store: SomeStore<TState, TActions, TEvents>
  events: EventEmitter<TEvents>
  set: ReducerSet<TState>
  diff: Diff<TState>
  dispatch: Dispatch<TState, TActions>
}

export type Reducer<
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = (props: ReducerProps<TState, TActions, TEvents>) => TState

function defaultReducer<
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
>(props: ReducerProps<TState, TActions, TEvents>) {
  return props.state
}

export type ExternalPropsFn<TExternalProps> = (() => Promise<TExternalProps>) | null

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  onConstruct?: OnConstruct<TInitialProps, TState, TActions, TEvents>
  reducer?: Reducer<TState, TActions, TEvents>
}

export type StoreConstructorConfig = {
  errorHandlers?: StoreErrorHandler[]
}

const BOOTSTRAP_TRANSITION = ["bootstrap"]

export function createStoreFactory<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple
>(
  {
    onConstruct = defaultOnConstruct<TInitialProps, TState, TActions, TEvents>,
    reducer: userReducer = defaultReducer<TState, TActions, TEvents>,
  }: CreateStoreOptions<TInitialProps, TState, TActions, TEvents> = {} as any
): StoreInstantiator<TInitialProps, TState, TActions, TEvents> {
  type Met = GenericStoreMethods<TState, TActions, TEvents>

  function createStore(
    initialProps: RemoveDollarSignProps<TInitialProps>,
    config: StoreConstructorConfig = {} as StoreConstructorConfig
  ): SomeStore<TState, TActions, TEvents> {
    const subject = createSubject()

    const storeValues: GenericStoreValues<TState, TEvents> = {
      transitions: new TransitionsStore(),
      events: new EventEmitter(),
      history: [],
      historyRedo: [],
      errorHandlers: new Set(),
      setStateCallbacks: {},
      state: {} as TState,
    }
    let store = storeValues as unknown as SomeStore<TState, TActions, TEvents>

    const createDiff = (oldState: TState, newState: TState) => {
      const [, diff] = createDiffOnKeyChange(oldState, newState)
      return diff
    }

    const createSetScheduler: Met["createSetScheduler"] = (
      newState,
      mergeType = "set",
      transition = null
    ): ReducerSet<TState> => {
      return setState => store.registerSet(setState, newState, transition, mergeType)
    }

    const getState: Met["getState"] = () => store.state

    const applyTransition = (
      transition: any[] | null | undefined,
      onTransitionEnd?: (state: TState) => void
    ) => {
      if (!transition) {
        debugger
        throw _noTransitionError
      }
      const transitionKey = transition.join(":")
      const setters = store.setStateCallbacks[transitionKey] ?? []
      if (!setters) {
        console.log(
          "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
        )
      }
      store.setStateCallbacks[transitionKey] = []
      const newState = setters.reduce(
        (acc: TState, setter) => {
          const newState = setter(acc)
          return { ...acc, ...newState }
        },
        { ...store.state }
      )
      store.state = newState
      store.history.push(newState)
      store.historyRedo = []
      onTransitionEnd?.(newState)
      subject.notify()
    }

    const handleRegisterTransition = (
      newState: TState,
      initialAction: TActions,
      store: SomeStore<TState, TActions, TEvents>
    ) => {
      const currentTransitionName = store.state.currentTransition?.join(":")
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
              handleError(error)
            } else {
              console.log(
                `%cTransition completed! [${initialAction.transition.join(":")}]`,
                "color: lightgreen"
              )
              applyTransition(initialAction.transition, initialAction.onTransitionEnd)
            }
          })
        }
      }
    }
    const dispatch: Met["dispatch"] = (initialAction: TActions) => {
      let newState = { ...store.state }
      handleRegisterTransition(newState, initialAction, store)

      const actionsQueue: TActions[] = [initialAction]

      let prevState = store.state
      for (const action of actionsQueue) {
        const scheduleSetter = createSetScheduler(newState, "set", action.transition)

        const futurePrevState = { ...newState }
        const context: ReducerProps<TState, TActions, TEvents> = {
          prevState: prevState,
          state: newState,
          action,
          events: store.events,
          store,
          async: createAsync(store, newState, action.transition),
          set: scheduleSetter,
          diff: createDiff(prevState, newState),
          dispatch: (action: TActions) => {
            actionsQueue.push({
              ...action,
              transition: initialAction.transition ?? null,
            })
          },
        }
        const producedState = userReducer(context)
        // looks redundant but user might return prev state
        newState = producedState
        prevState = futurePrevState
      }

      if (initialAction.transition == null) {
        store.state = newState
        subject.notify()
      } else {
        store.transitions.doneKey(initialAction.transition, null)
        // the observers will be notified
        // when the transition is done
      }
    }

    const handleError: Met["handleError"] = (error: unknown) => {
      store.errorHandlers.forEach(errorHandler => {
        errorHandler(error)
      })
    }

    const registerErrorHandler: Met["registerErrorHandler"] = (handler: StoreErrorHandler) => {
      store.errorHandlers.add(handler)
      return () => store.errorHandlers.delete(handler)
    }

    const undo: Met["undo"] = () => {
      if (store.history.length <= 1) return
      store.historyRedo = [...store.historyRedo, store.history.pop()!]
      const previousState = store.history.at(-1)!
      if (!previousState) debugger
      store.state = { ...previousState }
      subject.notify()
    }

    const redo: Met["redo"] = () => {
      if (store.historyRedo.length <= 0) return
      store.history = [...store.history, store.historyRedo.pop()!]
      const nextState = store.history.at(-1)!
      store.state = { ...nextState }
      subject.notify()
    }

    const rerender: Met["rerender"] = () => {
      store.state = userReducer({
        action: { type: "noop" } as TActions,
        diff: createDiff(store.state, store.state),
        state: store.state,
        async: createAsync(store, store.state, null),
        set: store.createSetScheduler(store.state, "set", null),
        prevState: store.state,
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })
      subject.notify()
    }

    const registerSet: Met["registerSet"] = (setter, currentState, transition, mergeType) => {
      if (transition) {
        const transitionKey = transition.join(":")
        store.setStateCallbacks[transitionKey] ??= []
        store.setStateCallbacks[transitionKey].push(setter)
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
        const processedState = userReducer({
          action: { type: "noop" } as TActions,
          state: newState,
          diff: createDiff(currentState, newState),
          set: createSetScheduler(newState, "set", transition),
          async: createAsync(store, newState, transition),
          prevState: currentState,
          events: store.events,
          dispatch: action => {
            debugger
          },
          store,
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

    const setState: Met["setState"] = (newPartialState: Partial<TState>) => {
      const newState = { ...store.state, ...newPartialState }
      store.state = userReducer({
        action: { type: "noop" } as TActions,
        diff: createDiff(store.state, newState),
        state: newState,
        prevState: store.state,
        async: createAsync(store, newState, null),
        set: store.createSetScheduler(newState, "set", null),
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })

      subject.notify()
    }

    const rebuild: Met["rebuild"] = () => {
      return () => createStore(initialProps, config)
    }

    const methods: Met = {
      createSetScheduler,
      getState,
      dispatch,
      setState,
      registerSet,
      registerErrorHandler,
      handleError,
      undo,
      redo,
      rerender,
      rebuild,
    }

    store = {
      ...subject,
      ...store,
      ...methods,
    }

    function construct(initialProps: TInitialProps, config: StoreConstructorConfig) {
      store.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])

      const prevState = {} as TState
      store.state = prevState
      const isAsync = isAsyncFunction(onConstruct)

      if (isAsync) {
        const bootstrapAction = {
          type: "bootstrap",
          transition: BOOTSTRAP_TRANSITION,
        } as TActions
        handleRegisterTransition(prevState, bootstrapAction, store)

        async function handleConstruction() {
          const initialState = await onConstruct({
            initialProps,
            store,
          })

          return initialState
        }

        const async = createAsync(store, prevState, BOOTSTRAP_TRANSITION)

        async.promise(handleConstruction(), (pureState, actor) => {
          const initialState = pureState as TState

          const processedState = userReducer({
            action: { type: "noop" } as TActions,
            state: initialState,
            diff: createDiff(prevState, initialState),
            async: createAsync(store, initialState, BOOTSTRAP_TRANSITION),
            set: createSetScheduler(initialState, "set", null),
            prevState,
            events: store.events,
            store,
            dispatch: (action: TActions) => {
              console.log("dispatch", action)
            },
          })

          const isSameAsPrev = Object.is(processedState, prevState)
          console.log(isSameAsPrev)

          actor.set(() => _.cloneDeep(processedState))
          store.transitions.doneKey(BOOTSTRAP_TRANSITION, null)
        })
      } else {
        try {
          const initialState = onConstruct({
            initialProps,
            store: store,
          }) as TState

          const processedState = userReducer({
            action: { type: "noop" } as TActions,
            state: initialState,
            diff: createDiff(prevState, initialState),
            async: createAsync(store, initialState, BOOTSTRAP_TRANSITION),
            set: createSetScheduler(initialState, "set", null),
            prevState,
            events: store.events,
            store,
            dispatch: (action: TActions) => {
              console.log("dispatch", action)
            },
          })

          store.state = processedState
        } catch (error) {
          handleError(error)
          throw error
        }
      }

      store.history = [store.state]
      store.historyRedo = []
    }

    construct(initialProps as TInitialProps, config)

    return store
  }

  return createStore
}
