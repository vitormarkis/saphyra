import { createDiffOnKeyChange } from "./diff"
import { createSubject } from "./Subject"
import { OptimisticRegistry, RemoveDollarSignProps } from "./types"
import { createAsync, errorNoTransition } from "./createAsync"
import { runSuccessCallback, TransitionsStore } from "./transitions-store"
import type {
  Async,
  AsyncPromiseProps,
  BaseAction,
  StateContext,
  DefaultActions,
  Diff,
  Dispatch,
  GenericAction,
  GenericStoreMethods,
  GenericStoreValues,
  ReducerSet,
  Setter,
  SetterOrPartialState,
  SomeStore,
  StoreErrorHandler,
  StoreInstantiator,
  StoreInternalEvents,
  ReducerOptimistic,
  Registry,
  SomeStoreGeneric,
} from "./types"
import { EventEmitter, EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { ErrorsStore } from "./errors-store"
import { createDefaultBeforeDispatch, isNewActionError } from "./utils"
import { getSnapshotAction } from "./helpers/get-snapshot-action"
import { Rollback } from "./helpers/rollback"
import { mockActor } from "./helpers/mock-actor"
import invariant from "tiny-invariant"
import { GENERAL_TRANSITION } from "./const"
import { assignObjValues, cloneObj, mergeObj } from "./helpers/obj-descriptors"
import {
  createDebugableShallowCopy,
  isAsyncFunction,
  isSetter,
  newSetter,
} from "./helpers/utils"
import { defaultErrorHandler } from "./default-error-handler"
import { setImmutable, setImmutableFn } from "./fn/common"
import { mockAsync } from "./helpers/mock-async"
import { mockEventEmitter } from "./helpers/mock-event-emitter"

export type ExternalProps = Record<string, any> | null

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  initialProps: TInitialProps
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  signal: AbortSignal
  deps: TDeps
}

type OnConstruct<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  props: OnConstructProps<
    TInitialProps,
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >,
  config?: StoreConstructorConfig<TDeps>
) => RemoveDollarSignProps<TState> | Promise<RemoveDollarSignProps<TState>>

function defaultOnConstruct<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
>(
  props: OnConstructProps<
    TInitialProps,
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >,
  _config?: StoreConstructorConfig<TDeps>
) {
  const state = props.initialProps as unknown as TState
  return cloneObj(state)
}

//

/**
 * Reducer
 */
type ReducerProps<
  TState,
  TActions extends BaseAction<TState> & DefaultActions,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  prevState: TState
  state: TState
  action: TActions
  async: Async<TState, TActions>
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  events: EventEmitter<TEvents>
  set: ReducerSet<TState>
  optimistic: ReducerOptimistic<TState>
  diff: Diff<TState>
  dispatch: Dispatch<TState, TActions>
  deps: TDeps
}

export type Reducer<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  props: ReducerProps<TState, TActions, TEvents, TUncontrolledState, TDeps>
) => TState

function defaultReducer<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
>(props: ReducerProps<TState, TActions, TEvents, TUncontrolledState, TDeps>) {
  return props.state
}

export type ExternalPropsFn<TExternalProps> =
  | (() => Promise<TExternalProps>)
  | null

type OnPushToHistoryProps<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  history: TState[]
  state: TState
  transition: any[] | null | undefined
  from: "dispatch" | "set"
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
}

type OnPushToHistory<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  props: OnPushToHistoryProps<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
) => TState[]

type CreateStoreOptionsConfig<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  onPushToHistory?: OnPushToHistory<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
}

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  onConstruct?: OnConstruct<
    TInitialProps,
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
  reducer?: Reducer<TState, TActions, TEvents, TUncontrolledState, TDeps>
  config?: CreateStoreOptionsConfig<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
}

export type StoreConstructorConfig<TDeps> = {
  name?: string
  errorHandlers?: StoreErrorHandler[]
  deps?: TDeps
}

const BOOTSTRAP_TRANSITION = ["bootstrap"]
const defaultOnPushToHistory = <
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
>({
  history,
  state,
  ...props
}: OnPushToHistoryProps<
  TState,
  TActions,
  TEvents,
  TUncontrolledState,
  TDeps
>) => {
  return [...history, state]
}

export function newStoreDef<
  TInitialProps extends Record<string, any>,
  TState extends Record<string, any> = TInitialProps,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  {
    onConstruct = defaultOnConstruct<
      TInitialProps,
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >,
    reducer: userReducer = defaultReducer<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >,
    config: globalConfig,
  } = {} as CreateStoreOptions<
    TInitialProps,
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
): StoreInstantiator<
  TInitialProps,
  TState,
  TActions,
  TEvents,
  TUncontrolledState,
  TDeps
> {
  type Met = GenericStoreMethods<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
  const { onPushToHistory = defaultOnPushToHistory } = globalConfig ?? {}

  function createStore(
    initialProps: RemoveDollarSignProps<TInitialProps>,
    config: StoreConstructorConfig<TDeps> = {} as StoreConstructorConfig<TDeps>
  ): SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps> {
    const subject = createSubject()
    const errorsStore = new ErrorsStore()
    const now = Date.now()
    const deps = config.deps ?? ({} as TDeps)

    const storeValues: GenericStoreValues<
      TState,
      TEvents,
      TUncontrolledState,
      TDeps
    > = {
      deps,
      errors: errorsStore,
      transitions: new TransitionsStore(),
      events: new EventEmitter<TEvents>(),
      internal: {
        events: new EventEmitter<StoreInternalEvents>(),
      },
      history: [],
      historyRedo: [],
      errorHandlers: new Set(),
      settersRegistry: {},
      optimisticRegistry: new OptimisticRegistry({
        onMutate(registry) {
          console.log("99: ", registry)
          store.optimisticState = calculateOptimisticState(
            registry,
            store.state
          )
          store.notify()
        },
      }),
      state: {} as TState,
      optimisticState: {} as TState,
      stateContext: {
        currentTransition: null,
        when: now,
      },
      uncontrolledState: {} as TUncontrolledState,
    }
    let store = createDebugableShallowCopy(
      storeValues as unknown as SomeStore<
        TState,
        TActions,
        TEvents,
        TUncontrolledState,
        TDeps
      >,
      "history"
    )

    const createDiff = (oldState: TState, newState: TState) => {
      const [, diff] = createDiffOnKeyChange(oldState, newState)
      return diff
    }

    const createOptimisticScheduler: Met["createOptimisticScheduler"] = (
      transition,
      notify
    ): ReducerOptimistic<TState> => {
      return setterOrPartialState =>
        store.registerOptimistic(setterOrPartialState, transition, notify)
    }

    const createSetScheduler: Met["createSetScheduler"] = (
      newState,
      newStateContext,
      mergeType = "set",
      transition = null
    ): ReducerSet<TState> => {
      return setterOrPartialState =>
        store.registerSet(
          setterOrPartialState,
          newState,
          newStateContext,
          transition,
          mergeType
        )
    }

    const getState: Met["getState"] = () => store.state
    const getOptimisticState: Met["getOptimisticState"] = () =>
      store.optimisticState

    function calculateOptimisticState(
      registry: Registry<TState>,
      state: TState
    ) {
      const allSetters = Object.values(registry).flat()
      if (allSetters.length === 0) return state
      /**
       * Use optimistic setters to derive more state
       *
       * Use derived setters to just mutate the state
       */
      const optimisticState = allSetters.reduce(
        (prevStateOriginal: TState, setter: SetterOrPartialState<TState>) => {
          setter = mergeSetterWithState(
            ensureSetter(setter as SetterOrPartialState<TState>)
          )
          const prevState = cloneObj(prevStateOriginal)
          const newState = setter(prevState) as TState
          const derivedSets: SetterOrPartialState<TState>[] = []
          const derivedState = userReducer({
            action: { type: "noop" } as TActions,
            diff: createDiff(prevState, newState),
            state: newState,
            prevState,
            async: mockAsync(),
            set: setterOrPartialState => {
              const setter = mergeSetterWithState(
                ensureSetter(
                  setterOrPartialState as SetterOrPartialState<TState>
                )
              )
              const newStateWithSetterApplied = setter(newState) as TState
              assignObjValues(newState, newStateWithSetterApplied)
              derivedSets.push(setterOrPartialState)
            },
            optimistic: () => {}, // allow only one level of optimistic updates per dispatch
            events: mockEventEmitter<TEvents>(),
            store,
            dispatch: () => {},
            deps,
          }) as TState
          const derivedStatePlusDerivations = applySettersListToState({
            state: derivedState,
            setters: derivedSets,
          })
          return derivedStatePlusDerivations
        },
        cloneObj(state)
      )

      return optimisticState
    }

    const defineState = (newState: TState) => {
      if (newState === undefined) debugger
      store.state = newState
      store.optimisticState = calculateOptimisticState(
        store.optimisticRegistry.get(),
        store.state
      )
    }

    const commitTransition: Met["commitTransition"] = (
      transition,
      onTransitionEnd
    ) => {
      if (!transition) {
        debugger
        throw errorNoTransition()
      }
      const transitionKey = transition.join(":")
      const setters = store.settersRegistry[transitionKey] ?? []
      if (!setters) {
        console.log(
          "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
        )
      }

      const newStateFromSetters = setters.reduce((acc: TState, setter) => {
        setter = mergeSetterWithState(ensureSetter(setter))
        const newState = setter(acc)
        return mergeObj(acc, newState) as TState
      }, cloneObj(store.state))

      store.settersRegistry = {
        ...store.settersRegistry,
        [transitionKey]: [],
      }
      store.optimisticRegistry.clear(transitionKey, "notify")

      const [newState, newHistory] = handleNewStateToHistory({
        state: newStateFromSetters,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition,
            from: "dispatch",
            store,
          }),
      })
      store.history = newHistory
      defineState(newState)

      store.historyRedo = []
      onTransitionEnd?.({
        events: store.events,
        meta: store.transitions.meta.get(transition),
        state: newState,
        transition,
        transitionStore: store.transitions,
      })
      subject.notify()
    }

    function completeTransition(action: GenericAction, transition: any[]) {
      const transitionString = transition.join(":")
      if (!transition) throw new Error("Impossible to reach this point")
      console.log(
        `%cTransition completed! [${transitionString}]`,
        "color: lightgreen"
      )
      commitTransition(transition, action.onTransitionEnd)
    }

    function getAbortController(props: {
      transition?: any[] | null | undefined
    }) {
      if (!props.transition)
        return {
          controller: undefined,
          rollback: noop,
        }
      const key = props.transition.join(":")
      const initial = store.transitions.controllers.values[key]
      return {
        controller: initial,
        rollback: () => {
          if (initial == null) {
            delete store.transitions.controllers.values[key]
            return
          }
          store.transitions.controllers.set(key, initial)
        },
      }
    }

    const cleanUpTransition = (transition: any[], error: unknown | null) => {
      const transitionKey = transition.join(":")
      if (transitionKey === "bootstrap") {
        errorsStore.setState({ bootstrap: error })
      }
      store.settersRegistry = setImmutable(
        store.settersRegistry,
        transitionKey,
        []
      )
      store.optimisticRegistry.clear(transitionKey, "notify")
      const newActionAbort = isNewActionError(error)
      if (!newActionAbort) {
        handleError(error, transition)
        console.log(`%cTransition failed! [${transitionKey}]`, "color: red")
      } else {
        console.log(
          `%cPrevious transition canceled! [${transitionKey}], creating new one.`,
          "color: orange"
        )
      }

      // // just to re-run optimistic state
      // defineState(store.state)
      // store.notify()
    }

    const handleRegisterTransition = (
      newState: TState,
      action: TActions,
      store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
      stateContext: StateContext,
      rollback: Rollback
    ) => {
      // stateContext ??= {
      //   currentTransition: null,
      //   when: Date.now(),
      // }
      const currentTransitionName = stateContext.currentTransition?.join(":")
      const actionTransitionName = action.transition?.join(":")!
      const isNewTransition = currentTransitionName !== actionTransitionName

      if (action.transition != null && isNewTransition) {
        stateContext.when = Date.now()
        stateContext.currentTransition = action.transition

        const initialAbort = getAbortController(action)
        rollback.add(initialAbort.rollback)
        const controller = ensureAbortController({
          transition: action.transition,
          controller: initialAbort.controller,
        })

        invariant(controller, "NSTH: controller is ensured")

        const wasAborted = controller.signal.aborted

        if (wasAborted) {
          // @ts-ignore
          store.events.emit(`abort::${JSON.stringify(action.transition)}`, null)

          store.transitions.eraseKey(action.transition, {
            onFinishTransition: noop,
          })
          cleanUpTransition(action.transition, {
            code: 20,
          })
        }

        stateContext.currentTransition = action.transition
        stateContext.when = Date.now()
        store.transitions.setController(action.transition, action.controller)

        /**
         * After running `beforeDispatch`, user may have aborted the transition,
         * which would case an error, being caught by async promise, doning the key
         * with the error, which mean the transition should not be running
         * from this point forward
         */
        const isRunning = store.transitions.get(action.transition) > 0
        store.transitions.addKey(action.transition)
        if (!isRunning) {
          const transition = action.transition
          const transitionString = transition.join(":")

          const internalTransitionId = `${transitionString}-${stateContext.when}`
          store.internal.events.emit("new-transition", {
            transitionName: transitionString,
            id: internalTransitionId,
          } as { transitionName: string; id: string })

          store.transitions.callbacks.done.set(transitionString, () => {
            store.completeTransition(action, transition)
            store.internal.events.emit("transition-completed", {
              id: internalTransitionId,
              status: "success",
            })
          })

          store.transitions.callbacks.error.set(transitionString, error => {
            invariant(action.transition, "NSTH: a transition")
            cleanUpTransition(action.transition, error)
            store.internal.events.emit("transition-completed", {
              id: internalTransitionId,
              status: "fail",
            })
            action.onTransitionEnd?.({
              error,
              events: store.events,
              meta: store.transitions.meta.get(transition),
              state: store.state,
              transition,
              transitionStore: store.transitions,
            })
          })
        }
      }
    }

    const dispatch: Met["dispatch"] = (initialAction: TActions) => {
      try {
        const rollback = new Rollback()
        return dispatchImpl(initialAction, rollback)
      } catch (error) {
        if (error instanceof Rollback) {
          error.rollback()
          return
        }

        handleError(error, initialAction.transition)
      }
    }

    const dispatchImpl = (initialAction: TActions, rollback: Rollback) => {
      let newState = cloneObj(store.state)
      let stateContext = cloneObj(store.stateContext)

      const { beforeDispatch = createDefaultBeforeDispatch() } = initialAction

      const initialController = ensureAbortController({
        transition: initialAction.transition ?? [GENERAL_TRANSITION],
        controller: initialAction.controller,
      })

      const rootAction = beforeDispatch({
        action: getSnapshotAction(initialAction),
        meta: store.transitions.meta.get(initialAction.transition),
        transitionStore: store.transitions,
        transition: initialAction.transition,
        events: store.events,
        async: (transition, signal) =>
          createAsync(
            store,
            newState,
            stateContext,
            transition,
            signal
          ) as Async<any, TActions>,
      }) as TActions

      if (rootAction == null) throw rollback

      handleRegisterTransition(
        newState,
        rootAction,
        store,
        stateContext,
        rollback
      )

      /**
       * Sobreescrevendo controller, quando na verdade cada action
       * deveria prover um controller
       *
       * No comportamento atual, ele quebra caso você clique duas vezes
       * para disparar a ação, e aborte usando o primeiro controller
       *
       * A primeira promise tem apenas o controller do primeiro dispatch, e não de todos
       */
      const controller = ensureAbortController({
        transition: rootAction.transition ?? [GENERAL_TRANSITION],
        controller: rootAction.controller,
      })
      const actionsQueue: TActions[] = [rootAction]

      let prevState = store.state
      for (const action of actionsQueue) {
        const scheduleSetter = createSetScheduler(
          newState,
          stateContext,
          "set",
          action.transition
        )

        const scheduleOptimistic = createOptimisticScheduler(
          action.transition,
          "notify"
        )

        const futurePrevState = cloneObj(newState)
        const context: ReducerProps<
          TState,
          TActions,
          TEvents,
          TUncontrolledState,
          TDeps
        > = {
          prevState: prevState,
          state: newState,
          action,
          events: store.events,
          store,
          async: createAsync(
            store,
            newState,
            stateContext,
            action.transition,
            controller.signal
          ),
          set: scheduleSetter,
          optimistic: scheduleOptimistic,
          diff: createDiff(prevState, newState),
          dispatch: (action: TActions) => {
            actionsQueue.push({
              ...action,
              transition: rootAction.transition ?? null, // sobreescrevendo transition, deve agrupar varias TODO
              onTransitionEnd: rootAction.onTransitionEnd ?? null,
            })
          },
          deps,
        }
        const reducer: Reducer<
          TState,
          TActions,
          TEvents,
          TUncontrolledState,
          TDeps
        > = (
          props: ReducerProps<
            TState,
            TActions,
            TEvents,
            TUncontrolledState,
            TDeps
          >
        ) => {
          if (props.action.type === "$$lazy-value") {
            props.async
              .promise(ctx => {
                return props.action.transitionFn({
                  transition: props.action.transition,
                  actor: mockActor(),
                  signal: ctx.signal,
                })
              })
              .onSuccess(props.action.onSuccess ?? noop)
          }
          return userReducer(props)
        }
        const producedState = reducer(context)
        // looks redundant but user might return prev state
        newState = producedState
        prevState = futurePrevState
      }

      if (rootAction.transition != null) {
        store.transitions.doneKey(rootAction.transition, {
          onFinishTransition: runSuccessCallback,
        })
        // the observers will be notified
        // when the transition is done
      } else {
        const _previousState = newState
        const [historyLatestState, newHistory] = handleNewStateToHistory({
          state: newState,
          getNewHistoryStack: state =>
            onPushToHistory({
              history: store.history,
              state,
              transition: null,
              from: "dispatch",
              store,
            }),
        })

        newState = historyLatestState
        store.history = newHistory
        defineState(newState)
        subject.notify()
      }
    }

    const handleError: Met["handleError"] = (error, transition) => {
      store.errorHandlers.forEach(handleError => {
        handleError(error, transition)
      })
    }

    const registerErrorHandler: Met["registerErrorHandler"] = (
      handler: StoreErrorHandler
    ) => {
      store.errorHandlers.add(handler)
      return () => store.errorHandlers.delete(handler)
    }

    const undo: Met["undo"] = () => {
      if (store.history.length <= 1) return
      store.historyRedo = [...store.historyRedo, store.history.pop()!]
      const previousState = store.history.at(-1)!
      if (!previousState) debugger
      defineState(cloneObj(previousState))
      subject.notify()
    }

    const redo: Met["redo"] = () => {
      if (store.historyRedo.length <= 0) return
      store.history = [...store.history, store.historyRedo.pop()!]
      const nextState = store.history.at(-1)!
      defineState(cloneObj(nextState))
      subject.notify()
    }

    const rerender: Met["rerender"] = () => {
      const transition = null
      const signal = new AbortController().signal
      const result = userReducer({
        action: { type: "noop" } as TActions,
        diff: createDiff(store.state, store.state),
        state: store.state,
        async: createAsync(
          store,
          store.state,
          store.stateContext,
          transition,
          signal
        ),
        set: store.createSetScheduler(
          store.state,
          store.stateContext,
          "set",
          transition
        ),
        optimistic: store.createOptimisticScheduler(transition, "notify"),
        prevState: store.state,
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
        deps,
      })
      defineState(result)
      subject.notify()
    }

    const registerOptimistic: Met["registerOptimistic"] = (
      setterOrPartialStateList,
      transition,
      notify: "notify" | "no-notify" = "notify"
    ) => {
      // 1. register de optimistic setter or partial state
      if (transition) {
        const transitionKey = transition.join(":")
        store.optimisticRegistry.add(
          transitionKey,
          setterOrPartialStateList,
          notify
        )
      }

      // 2. Do not assign to the reducer state!

      // // 3. Immediately calculate optimistic state and notify components
      // const optimisticState = calculateOptimisticState(
      //   store.optimisticRegistry,
      //   store.state
      // )
      // store.optimisticState = optimisticState
      // store.notify()
    }

    const registerSet: Met["registerSet"] = (
      setterOrPartialStateList,
      currentState,
      currentStateContext,
      transition,
      mergeType
    ) => {
      const { signal } = ensureAbortController({
        transition: transition ?? [GENERAL_TRANSITION],
      })
      if (transition) {
        const transitionKey = transition.join(":")

        store.settersRegistry = setImmutableFn(
          store.settersRegistry,
          transitionKey,
          (setters = []) => [...setters, setterOrPartialStateList]
        )
      }

      const setter = mergeSetterWithState(
        ensureSetter(setterOrPartialStateList)
      )
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
          set: createSetScheduler(
            newState,
            currentStateContext,
            "set",
            transition
          ),
          optimistic: store.createOptimisticScheduler(transition, "notify"),
          async: createAsync(
            store,
            newState,
            currentStateContext,
            transition,
            signal
          ),
          prevState: currentState,
          events: store.events,
          dispatch: action => {
            debugger
          },
          store,
          deps,
        })

        newState = mergeObj(newState, processedState)
      }

      assignObjValues(currentState, newState)
    }

    const setState: Met["setState"] = (newPartialState: Partial<TState>) => {
      const newState = mergeObj(store.state, newPartialState)
      const action = { type: "noop" } as TActions
      const { signal } = ensureAbortController({
        transition: action.transition ?? [GENERAL_TRANSITION],
        controller: action.controller,
      })
      const transition = null
      const stateFromReducer = userReducer({
        action,
        diff: createDiff(store.state, newState),
        state: newState,
        prevState: cloneObj(store.state),
        async: createAsync(
          store,
          newState,
          store.stateContext,
          transition,
          signal
        ), // um set state pode ocasionar em chamadas assíncronas, e como isso é cancelado?
        set: store.createSetScheduler(
          newState,
          store.stateContext,
          "set",
          transition
        ),
        optimistic: store.createOptimisticScheduler(transition, "notify"),
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
        deps,
      })

      const [historyLatestState, newHistory] = handleNewStateToHistory({
        state: stateFromReducer,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition: null,
            from: "set",
            store,
          }),
      })

      store.history = newHistory
      defineState(historyLatestState)

      subject.notify()
    }

    const rebuild: Met["rebuild"] = () => {
      return () => createStore(initialProps, config)
    }

    const methods: Met = {
      createSetScheduler,
      createOptimisticScheduler,
      getState,
      getOptimisticState,
      dispatch,
      setState,
      registerSet,
      registerOptimistic,
      registerErrorHandler,
      handleError,
      undo,
      redo,
      rerender,
      rebuild,
      completeTransition,
      commitTransition,
    }

    store = mergeObj(subject, store, methods)
    const ensureAbortController = createEnsureAbortController(store.transitions)

    function construct(
      initialProps: TInitialProps,
      config: StoreConstructorConfig<TDeps>
    ) {
      const rollback = new Rollback()
      Object.assign(window, { _store: store })

      store.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])

      const prevState = {} as TState
      const prevStateContext = {} as StateContext
      // prevState.role ??= "user"
      defineState(prevState)
      const isAsync = isAsyncFunction(onConstruct)

      const bootstrapAction = {
        type: "bootstrap",
        transition: BOOTSTRAP_TRANSITION,
      } as TActions
      handleRegisterTransition(
        prevState,
        bootstrapAction,
        store,
        prevStateContext,
        rollback
      )

      if (isAsync) {
        async function handleConstruction(ctx: AsyncPromiseProps) {
          const initialState = await onConstruct({
            initialProps,
            store,
            signal: ctx.signal,
            deps,
          })

          return initialState
        }

        const { signal } = ensureAbortController({
          transition: BOOTSTRAP_TRANSITION,
        })
        const async = createAsync(
          store,
          prevState,
          prevStateContext,
          BOOTSTRAP_TRANSITION,
          signal
        )

        async
          .promise(ctx => handleConstruction(ctx))
          .onSuccess(pureState => {
            const initialState = pureState as TState

            const processedState = userReducer({
              action: {
                type: "noop",
              } as TActions,
              state: initialState,
              diff: createDiff(prevState, initialState),
              async: createAsync(
                store,
                initialState,
                prevStateContext,
                BOOTSTRAP_TRANSITION,
                signal
              ),
              set: createSetScheduler(
                initialState,
                prevStateContext,
                "set",
                null // Should be BOOTSTRAP_TRANSITION?
              ),
              optimistic: store.createOptimisticScheduler(null, "notify"), // Should be BOOTSTRAP_TRANSITION?
              prevState,
              events: store.events,
              store,
              dispatch: (action: TActions) => {
                console.log("dispatch", action)
              },
              deps,
            })

            // Don't use actor.set since the prevState would be the same
            // as the one returned in the onConstruct again, causing derivations to run twice
            // (set state without invoking the reducer)
            defineState(processedState)
            subject.notify()
          })
      } else {
        const { signal } = ensureAbortController({
          transition: bootstrapAction.transition!,
        })
        try {
          const initialState = onConstruct({
            initialProps,
            store: store,
            signal,
            deps,
          }) as TState

          const processedState = userReducer({
            action: bootstrapAction,
            state: initialState,
            diff: createDiff(prevState, initialState),
            async: createAsync(
              store,
              initialState,
              prevStateContext,
              BOOTSTRAP_TRANSITION,
              signal
            ),
            set: createSetScheduler(
              initialState,
              prevStateContext,
              "set",
              null // Should be BOOTSTRAP_TRANSITION?
            ),
            optimistic: store.createOptimisticScheduler(null, "notify"), // Should be BOOTSTRAP_TRANSITION?
            prevState,
            events: store.events,
            store,
            dispatch: (action: TActions) => {
              console.log("dispatch", action)
            },
            deps,
          })

          defineState(processedState)
        } catch (error) {
          handleError(error, BOOTSTRAP_TRANSITION)
          throw error
        }
      }

      store.transitions.doneKey(BOOTSTRAP_TRANSITION, {
        onFinishTransition: runSuccessCallback,
      })

      const isOkToPushToHistory = (() => {
        const isTransitioning =
          Object.keys(store.transitions.state.transitions).length > 0

        if (isTransitioning) return false
        return true
      })()

      if (isOkToPushToHistory) {
        store.history = [store.state]
      }
      store.historyRedo = []
    }

    construct(initialProps as TInitialProps, config)

    return store
  }

  return createStore
}

export function createEnsureAbortController(transitionStore: TransitionsStore) {
  return function (props: {
    transition: any[]
    controller?: AbortController | null | undefined
  }): AbortController {
    const key = props.transition.join(":")
    let controller = transitionStore.controllers.get(key)
    if (controller != null) return controller
    controller = props.controller ?? new AbortController()
    transitionStore.controllers.set(props.transition, controller)
    return controller
  }
}

export function mergeSetterWithState<TState>(setter: Setter<TState>) {
  return (currentState: TState) => {
    const newState = isSetter(setter) ? setter(currentState) : setter
    return mergeObj(currentState, newState)
  }
}

export function ensureSetter<TState>(
  setterOrPartialStateList: SetterOrPartialState<TState>
) {
  return isSetter(setterOrPartialStateList)
    ? setterOrPartialStateList
    : newSetter(setterOrPartialStateList)
}

type HandleNewStateToHistoryProps<TState> = {
  state: TState
  getNewHistoryStack: (state: TState) => TState[]
}

function handleNewStateToHistory<TState>({
  state,
  getNewHistoryStack,
}: HandleNewStateToHistoryProps<TState>): [
  newState: TState,
  newHistory: TState[],
] {
  const newHistory = getNewHistoryStack(state)
  invariant(
    Array.isArray(newHistory),
    'You must return an array from "onPushToHistory" callback.'
  )
  if (newHistory.length === 0) {
    console.warn(
      "You should return some state within your new history stack array. It's likely want to return [state]. Saphyra is doing it under the hood."
    )
    newHistory.push(state)
  }
  const newState = newHistory.at(-1)!
  return [newState, newHistory] as const
}

type ApplySettersListToStateReturnType<TState> = {
  state: TState
  setters: SetterOrPartialState<TState>[]
}

function applySettersListToState<TState>({
  state,
  setters,
}: ApplySettersListToStateReturnType<TState>) {
  return setters.reduce((prevState: TState, setter) => {
    setter = mergeSetterWithState(
      ensureSetter(setter as SetterOrPartialState<TState>)
    )
    return setter(prevState) as TState
  }, state as TState)
}
