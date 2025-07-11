import { createDiffOnKeyChange } from "./diff"
import { createSubject } from "./Subject"
import {
  OptimisticRegistry,
  RemoveDollarSignProps,
  DerivationsConfig,
  RemoveFunctionProps,
} from "./types"
import { createAsync, errorNoTransition } from "./createAsync"
import { runSuccessCallback, TransitionsStore } from "./transitions-store"
import type {
  Async,
  AsyncPromiseProps,
  DefaultActions,
  Diff,
  Dispatch,
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
  InnerCreateAsync,
  HandleActionProps,
  OnTransitionEnd,
  BeforeDispatchOptions,
  ActionShape,
  ClassicAction,
  ClassicActionRedispatch,
  TransitionFunctionOptions,
  AsyncOperation,
  Transition,
  TransitionNullable,
} from "./types"
import { EventEmitter, EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { ErrorsStore } from "./errors-store"
import { isNewActionError, labelWhen } from "./utils"
import { getSnapshotAction } from "./helpers/get-snapshot-action"
import { Rollback } from "./helpers/rollback"
import invariant from "tiny-invariant"
import { GENERAL_TRANSITION } from "./const"
import { assignObjValues, cloneObj, mergeObj } from "./helpers/obj-descriptors"
import {
  createDebugableShallowCopy,
  ensureSetter,
  isAsyncFunction,
  isSetter,
} from "./helpers/utils"
import { defaultErrorHandler } from "./default-error-handler"
import { setImmutable } from "./fn/common"
import { mockAsync } from "./helpers/mock-async"
import { mockEventEmitter } from "./helpers/mock-event-emitter"
import { $$onDevMode, $$onDebugMode } from "./helpers/log"
import { TransitionsStateStore } from "./transitions-state"
import { DerivationsRegistry } from "./derivations-registry"
import { waitFor as waitForFn } from "./fn/wait-for"
import { newAsyncOperation } from "./async-operation"

export type ExternalProps = Record<string, any> | null

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
) =>
  | RemoveDollarSignProps<RemoveFunctionProps<TState>>
  | Promise<RemoveDollarSignProps<RemoveFunctionProps<TState>>>

function defaultOnConstruct<
  TInitialProps,
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  >
) {
  const state = props.initialProps as unknown as TState
  return cloneObj(state)
}

//

/**
 * Reducer
 */
type ReducerProps<
  TState extends Record<string, any>,
  TActions extends ActionShape & DefaultActions,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  prevState: TState
  state: TState
  action: ClassicAction<TState, TActions, TEvents>
  async: Async
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  events: EventEmitter<TEvents>
  set: ReducerSet<TState>
  optimistic: ReducerOptimistic<TState>
  diff: Diff<TState>
  dispatch: Dispatch<TState, TActions, TEvents>
  deps: TDeps
}

export type Reducer<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  props: ReducerProps<TState, TActions, TEvents, TUncontrolledState, TDeps>
) => TState

function defaultReducer<
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  history: TState[]
  state: TState
  transition: TransitionNullable
  from: "dispatch" | "set" | "rerender"
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  action: TActions
}

type OnPushToHistory<
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  TState extends Record<string, any>,
  TActions extends ActionShape,
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
  derivations?: DerivationsConfig<TState>
}

export type StoreConstructorConfig<TDeps> = {
  name?: string
  errorHandlers?: StoreErrorHandler[]
  deps?: TDeps
}

const BOOTSTRAP_TRANSITION = ["bootstrap"]
const defaultOnPushToHistory = <
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
>({
  history,
  state,
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
  TActions extends ActionShape = ActionShape,
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
    derivations,
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

  // Create derivations registry if derivations are provided
  const derivationsRegistry = derivations
    ? new DerivationsRegistry<TState>(derivations)
    : null

  function createStore(
    initialProps: RemoveFunctionProps<RemoveDollarSignProps<TInitialProps>>,
    config: StoreConstructorConfig<TDeps> = {} as StoreConstructorConfig<TDeps>
  ): SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps> {
    type Action = ClassicAction<TState, TActions, TEvents>
    type ActionRedispatch = ClassicActionRedispatch<TState, TActions, TEvents>
    const subject = createSubject()
    const errorsStore = new ErrorsStore()
    const deps = config.deps ?? ({} as unknown as TDeps)

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
      optimisticRegistry: new OptimisticRegistry(),
      state: {} as TState,
      optimisticState: {} as TState,
      uncontrolledState: {} as TUncontrolledState,
      transitionsState: new TransitionsStateStore<TState>(),
      derivationsRegistry,
    } as any

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

    const getState: Met["getState"] = () =>
      derivationsRegistry?.injectCachedGetters(store.state, "committed") ??
      store.state
    const getOptimisticState: Met["getOptimisticState"] = () =>
      derivationsRegistry?.injectCachedGetters(
        store.optimisticState,
        "optimistic"
      ) ?? store.optimisticState

    function calculateOptimisticState(
      allSetters: SetterOrPartialState<TState>[],
      state: TState
    ) {
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
      const allSetters = Object.values(store.optimisticRegistry.get()).flat()
      const opt = calculateOptimisticState(allSetters, store.state)
      store.optimisticState = opt
      noop()
    }

    const commitTransition: Met["commitTransition"] = (
      transition,
      action,
      onTransitionEnd
    ) => {
      if (!transition) {
        debugger
        throw errorNoTransition()
      }
      const transitionKey = transition.join(":")
      const setters = store.settersRegistry[transitionKey] ?? []
      if (!setters) {
        $$onDevMode(() =>
          console.log(
            "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
          )
        )
      }
      $$onDebugMode(() =>
        console.log("%c 00) k applying setters", "color: orange", setters)
      )

      const newStateFromSetters = setters.reduce(
        (acc: TState, stateOrSetter, _index) => {
          const setter = mergeSetterWithState(ensureSetter(stateOrSetter))
          const newState = setter(acc)
          return mergeObj(acc, newState) as TState
        },
        cloneObj(store.state)
      )

      store.settersRegistry = {
        ...store.settersRegistry,
        [transitionKey]: [],
      }
      updateTransitionState(transition, null)
      store.errors.setState({
        [transitionKey]: null,
      })

      store.optimisticRegistry.clear(transitionKey)
      const [newState, newHistory] = handleNewStateToHistory({
        state: newStateFromSetters,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition,
            from: "dispatch",
            store,
            action,
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

    function completeTransition(
      transition: Transition,
      action: TActions,
      onTransitionEnd?: OnTransitionEnd<TState, TEvents>
    ) {
      const transitionString = transition.join(":")
      if (!transition) throw new Error("Impossible to reach this point")
      $$onDevMode(() =>
        console.log(
          `%cTransition completed! [${transitionString}]`,
          "color: lightgreen"
        )
      )
      commitTransition(transition, action, onTransitionEnd)
    }

    function getAbortController(transition?: TransitionNullable) {
      if (!transition)
        return {
          controller: undefined,
          rollback: noop,
        }
      const key = transition.join(":")
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

    const cleanUpTransition = (
      transition: Transition,
      error: unknown | null
    ) => {
      const transitionKey = transition.join(":")
      const cleanUpList = store.transitions.cleanUpList[transitionKey] ?? []
      cleanUpList.forEach(fn => fn(error))
      store.transitions.cleanup(transitionKey)

      if (transitionKey === "bootstrap") {
        errorsStore.setState({ bootstrap: error })
      }
      store.settersRegistry = setImmutable(
        store.settersRegistry,
        transitionKey,
        []
      )
      updateTransitionState(transition, null)

      store.optimisticRegistry.clear(transitionKey)
      notifyOptimistic()
      // store.optimisticState = calculateOptimisticState(
      //   store.optimisticState,
      //   store.state
      // )
      store.notify()
      $$onDebugMode(() => console.log("66- clearing optimistic"))

      const newActionAbort = isNewActionError(error)
      if (!newActionAbort) {
        handleError(error, transition)
        $$onDevMode(() =>
          console.log(`%cTransition failed! [${transitionKey}]`, "color: red")
        )
      } else {
        $$onDevMode(() =>
          console.log(
            `%cPrevious transition canceled! [${transitionKey}], creating new one.`,
            "color: orange"
          )
        )
      }
    }

    const handleRegisterTransition = (
      action: ActionRedispatch,
      store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
    ) => {
      if (!action.transition) return
      const doneCallback = store.transitions.callbacks.done.get(
        action.transition.join(":")
      )
      const noTransitionsRunning = !store.transitions.isHappeningUnique(
        action.transition
      )
      if (noTransitionsRunning && !!doneCallback) {
        // Impossible case, some code didn't run the done callback
        // or some code didn't resolve the subtransition keys properly
        debugger
      }

      const shouldRegisterNewTransition = !doneCallback
      if (!shouldRegisterNewTransition) return

      const transition = action.transition
      const transitionString = transition.join(":")

      // store.internal.events.emit("new-transition", {
      //   transitionName: transitionString,
      //   id: internalTransitionId,
      // } as { transitionName: string; id: string })

      store.transitions.callbacks.done.set(transitionString, () => {
        $$onDebugMode(() =>
          console.log(`00) k done [${transitionString}]`, store.settersRegistry)
        )
        store.completeTransition(transition, action, action.onTransitionEnd)
        // store.internal.events.emit("transition-completed", {
        //   id: internalTransitionId,
        //   status: "success",
        // })
      })

      store.transitions.callbacks.error.set(transitionString, error => {
        invariant(action.transition, "NSTH: a transition")
        cleanUpTransition(action.transition, error)
        // store.internal.events.emit("transition-completed", {
        //   id: internalTransitionId,
        //   status: "fail",
        // })
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

    type RunOptimisticsOnlyProps = {
      prevState: TState
      newState: TState
      action: Action
    }

    const runOptimisticsOnly = ({
      action,
      prevState,
      newState,
    }: RunOptimisticsOnlyProps) => {
      const scheduleOptimistic = createOptimisticScheduler(
        action.transition,
        "notify"
      )

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
        events: mockEventEmitter<TEvents>(),
        store,
        async: mockAsync(),
        set: () => {},
        optimistic: scheduleOptimistic,
        diff: createDiff(prevState, newState),
        dispatch: () => {},
        deps,
      }

      const transitionString = action.transition?.join(":")
      const signal = transitionString
        ? store.transitions.controllers.values[transitionString]?.signal
        : null
      if (signal?.aborted) return

      // I'm not using the returned state here because the only side effect that I want
      // is happening on the `scheduleOptimistic`, which is updating the optimistic state
      // immediately
      userReducer(context)
      notifyOptimistic()
    }

    const abort: BeforeDispatchOptions<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >["abort"] = transition => {
      const isHappening = store.transitions.isHappeningUnique(transition)
      if (!isHappening || !transition) return
      const controller = store.transitions.controllers.get(transition)
      // I would love to run `cleanUpTransition` as an event listener of the signal abortion
      cleanUpTransition(transition!, { code: 20 })
      const newController = new AbortController()
      controller?.signal.addEventListener("abort", () => {
        store.transitions.setController(transition, newController)
        // store.cleanUpTransition(transition!, { code: 20 }) // <- like this!
      })
      controller?.abort()
    }

    type DispatchInternalProps = {
      action: Action
      setterOrPartialState: SetterOrPartialState<TState> | null
      when?: string
    }

    const dispatchInternal = ({
      action,
      when = labelWhen(new Date()),
      setterOrPartialState,
    }: DispatchInternalProps) => {
      try {
        const rollback = new Rollback()
        return dispatchImpl(action, rollback, setterOrPartialState, when)
      } catch (error) {
        if (error instanceof Rollback) {
          error.rollback()
          return
        }

        handleError(error, action.transition)
      }
    }

    const dispatch: Met["dispatch"] = (initialAction: Action) => {
      return dispatchInternal({
        action: initialAction,
        setterOrPartialState: null,
        when: labelWhen(new Date()),
      })
    }

    const dispatchImpl = (
      initialAction: Action,
      rollback: Rollback,
      setterOrPartialState: SetterOrPartialState<TState> | null,
      when: string
    ) => {
      let newState = cloneObj(store.state)
      let prevState: TState | null = null
      if (initialAction.transition) {
        const transitionKey = initialAction.transition.join(":")
        const getTransitionState = () =>
          cloneObj(store.transitionsState.state[transitionKey] ?? store.state)
        prevState = getTransitionState()
        if (setterOrPartialState) {
          updateTransitionState(initialAction.transition, setterOrPartialState)
        }
        newState = getTransitionState()
      } else {
        if (setterOrPartialState) {
          const setter = mergeSetterWithState(
            ensureSetter(setterOrPartialState)
          )
          newState = setter(newState)
        }
      }

      const defaultBeforeDispatch = (
        props: BeforeDispatchOptions<
          TState,
          ActionRedispatch,
          TEvents,
          TUncontrolledState,
          TDeps
        >
      ) => {
        return props.action
      }
      const { beforeDispatch = defaultBeforeDispatch } = initialAction

      if (initialAction.transition && initialAction.controller) {
        store.transitions.setController(
          initialAction.transition,
          initialAction.controller
        )
      }
      const initialAbort = getAbortController(initialAction.transition)
      rollback.add(initialAbort.rollback)

      const initialController = ensureAbortController({
        transition: initialAction.transition ?? [GENERAL_TRANSITION],
        controller: initialAction.controller,
      })

      const asyncOperations: AsyncOperation[] = []
      const opts: BeforeDispatchOptions<
        TState,
        TActions,
        TEvents,
        TUncontrolledState,
        TDeps
      > = {
        action: getSnapshotAction<TState, TEvents, TActions>(initialAction),
        meta: store.transitions.meta.get(initialAction.transition),
        transitionStore: store.transitions,
        transition: initialAction.transition,
        events: store.events,
        createAsync: (transition, signal) =>
          createAsync(
            store,
            when,
            transition ?? initialAction.transition,
            signal ?? initialController.signal,
            asyncOp => {
              asyncOperations.push(asyncOp)
            },
            "before-dispatch-async"
          ),
        abort,
        store,
      }

      const rootAction = beforeDispatch(opts as any)
      asyncOperations.forEach(asyncOperation => asyncOperation.fn?.())

      if (rootAction == null) {
        const scheduledTransition = store.transitions.isHappeningUnique(
          initialAction.transition
        )
        if (scheduledTransition) {
          runOptimisticsOnly({
            action: initialAction,
            newState,
            prevState: prevState ?? store.state,
          })
          $$onDebugMode(() =>
            console.log("%c 44: done dispatching! (opt)", "color: coral")
          )
        } else {
          // Returned no action and didn't even schedule a transition,
          // it means the action is done and there is no more computation to do
        }
        return
      }

      const dispatchWithTransitionAsyncOP = newAsyncOperation({
        type: "manual",
        when: Date.now(),
      })
      if (rootAction.transition) {
        store.transitions.addKey(
          rootAction.transition,
          dispatchWithTransitionAsyncOP,
          "dispatch/new-transition"
        )
      }
      handleRegisterTransition(rootAction, store)

      /**
       * Sobreescrevendo controller, quando na verdade cada action
       * deveria prover um controller
       *
       * No comportamento atual, ele quebra caso você clique duas vezes
       * para disparar a ação, e aborte usando o primeiro controller
       *
       * A primeira promise tem apenas o controller do primeiro dispatch, e não de todos
       */

      const handledDispatch = handleAction(rootAction, {
        when,
        state: newState,
        prevState: prevState ?? undefined,
      })
      newState = handledDispatch.newState

      if (rootAction.transition != null) {
        store.transitions.doneKey(
          rootAction.transition,
          dispatchWithTransitionAsyncOP,
          {
            onFinishTransition: runSuccessCallback,
          },
          "action-had-transition"
        )
        // the observers will be notified
        // when the transition is done
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              action: rootAction,
            }),
        })

        newState = historyLatestState
        store.history = newHistory
        defineState(newState)
        subject.notify()
      }
      $$onDebugMode(() =>
        console.log("%c 44: done dispatching!", "color: coral")
      )
    }

    const handleError: Met["handleError"] = (error, transition) => {
      store.errorHandlers.forEach(handleError => {
        handleError(error, transition)
      })
      if (transition) {
        const transitionKey = transition.join(":")
        store.errors.setState({
          [transitionKey]: error,
        })
      }
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
      const when = labelWhen(new Date())
      const action = { type: "noop" } as TActions
      const actionResult = handleAction(action, {
        when,
      })
      const [historyLatestState, newHistory] = handleNewStateToHistory({
        state: actionResult.newState,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition: null,
            from: "rerender",
            store,
            action,
          }),
      })

      store.history = newHistory
      defineState(historyLatestState)

      subject.notify()
    }

    const registerOptimistic: Met["registerOptimistic"] = (
      setterOrPartialStateList,
      transition
    ) => {
      // 1. register de optimistic setter or partial state
      if (transition) {
        const transitionKey = transition.join(":")
        store.optimisticRegistry.add(transitionKey, setterOrPartialStateList)
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

    const defaultInnerCreateAsync = ({
      store,
      when,
      transition,
      signal,
      onAsyncOperation,
      from,
    }: InnerCreateAsync<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >) => {
      return createAsync(
        store,
        when,
        transition,
        signal,
        onAsyncOperation,
        from
      )
    }

    const registerOnOptimisticSettersRegistry = (
      setterOrPartialState: SetterOrPartialState<TState>,
      transition: Transition
    ) => {
      const transitionKey = transition.join(":")
      store.optimisticRegistry.add(transitionKey, setterOrPartialState)
    }

    const applySetterOnState = (
      setterOrPartialState: SetterOrPartialState<TState>,
      state: TState
    ) => {
      const setter = ensureSetter(setterOrPartialState)
      const stateFromSetter = setter(state)
      assignObjValues(state, stateFromSetter)
    }

    const handleAction = (
      rootAction: ActionRedispatch,
      props: HandleActionProps<
        TState,
        TActions,
        TEvents,
        TUncontrolledState,
        TDeps
      >
    ): { newState: TState; prevState: TState; optimisticState: TState } => {
      const { when, optimisticStateSource } = props
      let newState = cloneObj(props?.state ?? store.state)
      let prevState = props?.prevState ?? store.state
      const optimisticState = cloneObj(
        props?.optimisticState ?? store.optimisticState
      )
      const { createAsync = defaultInnerCreateAsync } = props ?? {}

      const transition = rootAction.transition
      const controller = ensureAbortController({
        transition: transition ?? [GENERAL_TRANSITION],
        controller: rootAction.controller,
      })
      const signal = controller.signal

      let isSync = true
      const actionsQueue: Action[] = [rootAction]

      const getStateToUseOnAction = createGetStateToUseOnAction(
        transition,
        derivationsRegistry,
        store.transitionsState
      )

      try {
        const asyncOperations: AsyncOperation[] = []
        for (const action of actionsQueue) {
          const futurePrevState = cloneObj(newState)
          const async: Async = createAsync({
            when,
            store,
            transition: action.transition,
            signal,
            onAsyncOperation: asyncOp => {
              asyncOperations.push(asyncOp)
            },
            from: "action",
          })
          prevState = getStateToUseOnAction(prevState, "prev")
          newState = getStateToUseOnAction(newState, "current")
          const context: ReducerProps<
            TState,
            TActions,
            TEvents,
            TUncontrolledState,
            TDeps
          > = {
            prevState,
            state: newState,
            action,
            events: store.events,
            store,
            async,
            optimistic: setterOrPartialState => {
              if (signal.aborted) return
              if (!transition) return
              registerOnOptimisticSettersRegistry(
                setterOrPartialState,
                transition
              )
              applySetterOnState(setterOrPartialState, optimisticState)

              notifyOptimistic(optimisticStateSource ?? newState)
            },
            set: setterOrPartialState => {
              if (signal.aborted) return
              props?.onSet?.(setterOrPartialState)
              if (isSync) {
                if (transition) {
                  const newTransitionState = updateTransitionState(
                    transition,
                    setterOrPartialState
                  )
                  assignObjValues(newState, newTransitionState)
                } else {
                  applySetterOnState(setterOrPartialState, newState)
                }
              } else {
                store.setState(setterOrPartialState, { transition })
              }
            },
            diff: createDiff(prevState, newState),
            dispatch: (action: Action) => {
              if (signal.aborted) return
              const safeAction = {
                ...action,
                transition: rootAction.transition ?? null, // sobreescrevendo transition, deve agrupar varias TODO
                onTransitionEnd: () => {}, // it will become a mess if multiple of these run at the same time
              }
              if (isSync) {
                actionsQueue.push(safeAction)
              } else {
                store.dispatch(safeAction)
              }
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
              props.async.promise(async ctx => {
                const action = props.action as unknown as {
                  transitionFn: (
                    options: TransitionFunctionOptions
                  ) => Promise<any>
                }
                await action.transitionFn({
                  transition: props.action.transition,
                  signal: ctx.signal,
                })
              })
            }
            return userReducer(props)
          }
          const producedState = reducer(context)
          // looks redundant but user might return prev state
          // if (transition)
          //   store.transitionsState.prevState[transition.join(":")] = newState
          newState = producedState
          prevState = futurePrevState
        }
        asyncOperations.forEach(asyncOperation => asyncOperation.fn?.())
      } catch (error) {
        if (!transition) {
          throw error
        } else {
          const isHappening = store.transitions.isHappeningUnique(transition)
          if (isHappening) {
            cleanUpTransition(transition, error)
          } else {
            handleError(error, transition)
          }
        }
      }

      isSync = false

      notifyOptimistic(optimisticStateSource ?? newState)

      return {
        newState,
        prevState,
        optimisticState,
      }
    }

    const updateTransitionState = (
      transition: Transition,
      setterOrPartialState: SetterOrPartialState<TState> | null
    ): TState | null => {
      const transitionKey = transition.join(":")
      const setter = setterOrPartialState
        ? ensureSetter(setterOrPartialState)
        : null

      if (setter) {
        store.settersRegistry = {
          ...store.settersRegistry,
          [transitionKey]: [
            ...(store.settersRegistry[transitionKey] ?? []),
            setter,
          ],
        }
      }

      let returningState: TState | null = null
      const setters = store.settersRegistry[transitionKey] ?? []

      const shouldClear = setters.length === 0

      if (shouldClear) {
        store.transitionsState.setState({
          [transitionKey]: null,
        })
        return store.state
      }

      const newState = cloneObj(
        store.transitionsState.get(transition) ?? store.state
      )
      if (setterOrPartialState) {
        applySetterOnState(setterOrPartialState, newState)
      }
      store.transitionsState.setState({
        [transitionKey]: newState,
      })

      if (transitionKey === transitionKey) {
        returningState = newState
      }

      return returningState
    }

    // const handleSetStateTransitionOngoing = (
    //   setterOrPartialState: SetterOrPartialState<TState>,
    //   action: Action & { transition: Transition },
    //   when: string
    // ) => {
    //   const transitionString = action.transition.join(":")
    //   const getTransitionState = () =>
    //     store.transitionsState.state[transitionString] ?? store.state
    //   const prevState = getTransitionState()

    //   // Updates the store.transitionsState
    //   updateTransitionState(action.transition, setterOrPartialState)

    //   const state = getTransitionState()

    //   handleAction(action, {
    //     when,
    //     state,
    //     prevState,
    //     optimisticStateSource: store.state,
    //   })
    // }

    // const handleSetStateTransitionToStart = (
    //   setterOrPartialState: SetterOrPartialState<TState>,
    //   action: Action & { transition: Transition },
    //   when: string
    // ) => {
    //   const state = store.state

    //   const setter = ensureSetter(setterOrPartialState)
    //   const newPartialState = setter(state)

    //   handleAction(action, {
    //     when,
    //     state: mergeObj(state, newPartialState),
    //   })
    // }

    const setState: Met["setState"] = (setterOrPartialState, options) => {
      const when = labelWhen(new Date())
      dispatchInternal({
        action: {
          type: "noop",
          transition: options?.transition ?? null,
        } as Action,
        setterOrPartialState,
        when,
      })
    }

    const rebuild: Met["rebuild"] = () => {
      return () => createStore(initialProps, config)
    }

    function notifyOptimistic(state = store.state) {
      const allSetters = Object.values(store.optimisticRegistry.get()).flat()
      store.optimisticState = calculateOptimisticState(allSetters, state)
      store.notify()
    }

    const waitFor: Met["waitFor"] = (transition, timeout = 5000) => {
      return waitForFn(store, transition, timeout)
    }
    const waitForBootstrap: Met["waitForBootstrap"] = (timeout = 5000) => {
      return waitForFn(store, ["bootstrap"], timeout)
    }

    const methods: Met = {
      createOptimisticScheduler,
      getState,
      getOptimisticState,
      dispatch,
      setState,
      registerOptimistic,
      registerErrorHandler,
      handleError,
      undo,
      redo,
      rerender,
      rebuild,
      completeTransition,
      commitTransition,
      cleanUpTransition,
      handleAction,
      abort,
      waitFor,
      waitForBootstrap,
    }

    store = mergeObj(subject, store, methods)
    const ensureAbortController = createEnsureAbortController(store.transitions)

    function construct(
      initialProps: TInitialProps,
      config: StoreConstructorConfig<TDeps>
    ) {
      let isSyncOp = true
      const isSync = () => isSyncOp
      const when = labelWhen(new Date())
      const rollback = new Rollback()

      store.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])

      const prevState = {} as TState
      // prevState.role ??= "user"
      defineState(prevState)

      const initialAbort = getAbortController(BOOTSTRAP_TRANSITION)
      rollback.add(initialAbort.rollback)
      ensureAbortController({
        transition: BOOTSTRAP_TRANSITION,
        controller: initialAbort.controller,
      })

      const bootstrapAsyncOP = newAsyncOperation({
        type: "manual",
        when: Date.now(),
      })
      store.transitions.addKey(
        BOOTSTRAP_TRANSITION,
        bootstrapAsyncOP,
        "dispatch/on-construct"
      )
      const bootstrapAction = {
        type: "bootstrap",
        transition: BOOTSTRAP_TRANSITION,
      } as Action
      handleRegisterTransition(bootstrapAction, store)

      const isAsync = isAsyncFunction(onConstruct)
      if (isAsync) {
        async function handleConstruction(ctx: AsyncPromiseProps) {
          if (ctx.signal.aborted) throw { code: 20 }
          const initialState = await onConstruct({
            initialProps,
            store: createOnConstructStore(store, isSync),
            signal: ctx.signal,
            deps,
          })

          return initialState
        }

        const { signal } = ensureAbortController({
          transition: BOOTSTRAP_TRANSITION,
        })
        const asyncOperations: AsyncOperation[] = []
        const async = createAsync(
          store,
          when,
          BOOTSTRAP_TRANSITION,
          signal,
          asyncOp => {
            asyncOperations.push(asyncOp)
          },
          "on-construct-async"
        )

        async.promise(async ctx => {
          const pureState = await handleConstruction(ctx)
          const initialState = pureState as TState
          updateTransitionState(BOOTSTRAP_TRANSITION, initialState)

          const handledDispatch = handleAction(
            {
              type: "noop",
              transition: BOOTSTRAP_TRANSITION,
            } as Action,
            {
              when,
              prevState,
              state: initialState,
            }
          )

          const processedState = handledDispatch.newState

          defineState(processedState)
          subject.notify()
        })
        asyncOperations.forEach(asyncOperation => asyncOperation.fn?.())
      } else {
        const { signal } = ensureAbortController({
          transition: bootstrapAction.transition!,
        })
        try {
          const initialState = onConstruct({
            initialProps,
            store: createOnConstructStore(store, isSync),
            signal,
            deps,
          }) as TState

          updateTransitionState(BOOTSTRAP_TRANSITION, initialState)

          const { newState: processedState } = handleAction(bootstrapAction, {
            when,
            state: initialState,
            prevState,
          })

          defineState(processedState)
        } catch (error) {
          handleError(error, BOOTSTRAP_TRANSITION)
          throw error
        } finally {
          isSyncOp = false
        }
      }

      store.transitions.doneKey(
        BOOTSTRAP_TRANSITION,
        bootstrapAsyncOP,
        {
          onFinishTransition: runSuccessCallback,
        },
        "bootstrap"
      )

      const isOkToPushToHistory = (() => {
        const isTransitioning = Object.keys(store.transitions.state).length > 0

        if (isTransitioning) return false
        return true
      })()

      if (isOkToPushToHistory) {
        store.history = [store.state]
      }
      store.historyRedo = []
    }

    try {
      construct(initialProps as unknown as TInitialProps, config)
    } catch {
      noop()
    }

    return store
  }

  return createStore
}

export function createEnsureAbortController(transitionStore: TransitionsStore) {
  return function (props: {
    transition: Transition
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

function createGetStateToUseOnAction<TState>(
  transition: TransitionNullable,
  derivationsRegistry: DerivationsRegistry<TState> | null,
  transitionsState: TransitionsStateStore<TState>
) {
  return (state: TState, type: "prev" | "current") => {
    if (transition) {
      return getStateToUseOnActionTransition(
        state,
        transition,
        derivationsRegistry,
        transitionsState,
        type
      )
    }

    if (derivationsRegistry) {
      return (
        derivationsRegistry.injectCachedGetters(state, "committed") ?? state
      )
    }

    return state
  }
}

function getStateToUseOnActionTransition<TState>(
  state: TState,
  transition: Transition,
  derivationsRegistry: DerivationsRegistry<TState> | null,
  transitionsState: TransitionsStateStore<TState>,
  type: "prev" | "current"
) {
  const transitionKey = transition.join(":")
  const transitionState =
    type === "prev"
      ? (transitionsState.prevState[transitionKey] ?? state)
      : (transitionsState.state[transitionKey] ?? state)
  if (derivationsRegistry) {
    return derivationsRegistry.injectCachedGetters(
      transitionState,
      `transition:${transitionKey}`
    )
  }

  return transitionState
}

function createOnConstructStore<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  _getIsSync: () => boolean
): SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps> {
  return store
  // TO-DO
  // return {
  //   ...store,
  //   dispatch: (...args) => {
  //     // if (getIsSync()) {
  //     //   throw new Error(
  //     //     "You cannot call dispatch synchronously inside onConstruct"
  //     //   )
  //     // }
  //     return store.dispatch(...args)
  //   },
  //   setState: (...args) => {
  //     // if (getIsSync()) {
  //     //   throw new Error(
  //     //     "You cannot call setState synchronously inside onConstruct"
  //     //   )
  //     // }
  //     return store.setState(...args)
  //   },
  // }
}
