import { createDiffOnKeyChange } from "./diff"
import { createSubject } from "./Subject"
import { OptimisticRegistry, RemoveDollarSignProps } from "./types"
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
  Registry,
  InnerCreateAsync,
  HandleActionProps,
  OnTransitionEnd,
  BeforeDispatchOptions,
  ActionShape,
  ClassicAction,
  ClassicActionRedispatch,
  TransitionFunctionOptions,
} from "./types"
import { EventEmitter, EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { ErrorsStore } from "./errors-store"
import { createAncestor, isNewActionError, labelWhen } from "./utils"
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
  newSetter,
} from "./helpers/utils"
import { defaultErrorHandler } from "./default-error-handler"
import { setImmutable, setImmutableFn } from "./fn/common"
import { mockAsync } from "./helpers/mock-async"
import { mockEventEmitter } from "./helpers/mock-event-emitter"
import { log, logDebug } from "./helpers/log"
import { TransitionsStateStore } from "./transitions-state"

export type ExternalProps = Record<string, any> | null

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents>,
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
  TActions extends ActionShape<TState, TEvents>,
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
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents>,
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
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents> & DefaultActions,
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
  TActions extends ActionShape<TState, TEvents>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  props: ReducerProps<TState, TActions, TEvents, TUncontrolledState, TDeps>
) => TState

function defaultReducer<
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents>,
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
  TActions extends ActionShape<TState, TEvents>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  history: TState[]
  state: TState
  transition: any[] | null | undefined
  from: "dispatch" | "set" | "rerender"
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  action: TActions
}

type OnPushToHistory<
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents>,
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
  TActions extends ActionShape<TState, TEvents>,
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
  TActions extends ActionShape<TState, TEvents>,
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
  TState extends Record<string, any>,
  TActions extends ActionShape<TState, TEvents>,
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
  TActions extends ActionShape<TState, TEvents> = ActionShape<TState, any>,
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
    type Action = ClassicAction<TState, TActions, TEvents>
    type ActionRedispatch = ClassicActionRedispatch<TState, TActions, TEvents>
    const subject = createSubject()
    const errorsStore = new ErrorsStore()
    const now = Date.now()
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

    const getState: Met["getState"] = () => store.state
    const getOptimisticState: Met["getOptimisticState"] = () =>
      store.optimisticState

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
        log(
          "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
        )
      }
      logDebug("%c 00) k applying setters", "color: orange", setters)
      // if (setters.length > 0) {
      //   const has = setters.some(s => "name" in s)
      //   if (!has) debugger
      // }

      if (setters.length === 0 && transitionKey !== "bootstrap") debugger
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
      transition: any[],
      action: TActions,
      onTransitionEnd?: OnTransitionEnd<TState, TEvents>
    ) {
      const transitionString = transition.join(":")
      if (!transition) throw new Error("Impossible to reach this point")
      log(`%cTransition completed! [${transitionString}]`, "color: lightgreen")
      commitTransition(transition, action, onTransitionEnd)
    }

    function getAbortController(transition?: any[] | null | undefined) {
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

    const cleanUpTransition = (transition: any[], error: unknown | null) => {
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
      logDebug("66- clearing optimistic")

      const newActionAbort = isNewActionError(error)
      if (!newActionAbort) {
        handleError(error, transition)
        log(`%cTransition failed! [${transitionKey}]`, "color: red")
      } else {
        log(
          `%cPrevious transition canceled! [${transitionKey}], creating new one.`,
          "color: orange"
        )
      }
    }

    const handleRegisterTransition = (
      action: ActionRedispatch,
      store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
      when: string
    ) => {
      if (!action.transition) return
      const doneCallback = store.transitions.callbacks.done.get(
        action.transition.join(":")
      )
      const noTransitionsRunning =
        store.transitions.get(action.transition) === 0
      if (noTransitionsRunning && !!doneCallback) {
        // Impossible case, some code didn't run the done callback
        // or some code didn't resolve the subtransition keys properly
        debugger
      }

      const shouldRegisterNewTransition = !doneCallback
      if (!shouldRegisterNewTransition) return

      const transition = action.transition
      const transitionString = transition.join(":")

      const internalTransitionId = `${transitionString}-${when}`
      // store.internal.events.emit("new-transition", {
      //   transitionName: transitionString,
      //   id: internalTransitionId,
      // } as { transitionName: string; id: string })

      store.transitions.callbacks.done.set(transitionString, () => {
        logDebug(`00) k done [${transitionString}]`, store.settersRegistry)
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

    const dispatch: Met["dispatch"] = (initialAction: Action) => {
      const when = labelWhen(new Date())
      try {
        const rollback = new Rollback()
        return dispatchImpl(initialAction, rollback, when)
      } catch (error) {
        if (error instanceof Rollback) {
          error.rollback()
          return
        }

        handleError(error, initialAction.transition)
      }
    }

    const dispatchImpl = (
      initialAction: Action,
      rollback: Rollback,
      when: string
    ) => {
      let newState = cloneObj(store.state)

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
            "before-dispatch-async"
          ),
        abort,
        store,
      }

      let rootAction = beforeDispatch(opts as any)

      if (rootAction == null) {
        const scheduledTransition = store.transitions.isHappeningUnique(
          initialAction.transition
        )
        if (scheduledTransition) {
          runOptimisticsOnly({
            action: initialAction,
            newState,
            prevState: store.state,
          })
          logDebug("%c 44: done dispatching! (opt)", "color: coral")
        } else {
          // Returned no action and didn't even schedule a transition,
          // it means the action is done and there is no more computation to do
        }
        return
      }

      rootAction
      store.transitions.addKey(rootAction.transition, "dispatch/new-transition")
      handleRegisterTransition(rootAction, store, when)

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
      })
      newState = handledDispatch.newState

      if (rootAction.transition != null) {
        store.transitions.doneKey(
          rootAction.transition,
          {
            onFinishTransition: runSuccessCallback,
          },
          "action-had-transition"
        )
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
              action: rootAction,
            }),
        })

        newState = historyLatestState
        store.history = newHistory
        defineState(newState)
        subject.notify()
      }
      logDebug("%c 44: done dispatching!", "color: coral")
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
      transition,
      notify: "notify" | "no-notify" = "notify"
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
      from,
    }: InnerCreateAsync<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >) => {
      return createAsync(store, when, transition, signal, from)
    }

    const registerOnOptimisticSettersRegistry = (
      setterOrPartialState: SetterOrPartialState<TState>,
      transition: any[]
    ) => {
      const transitionKey = transition.join(":")
      store.optimisticRegistry.add(transitionKey, setterOrPartialState)
    }

    const applySetterOnCurrentState = (
      setterOrPartialState: SetterOrPartialState<TState>,
      setterState: TState,
      newState: TState
    ) => {
      const setter = ensureSetter(setterOrPartialState)
      const stateFromSetter = setter(setterState)
      assignObjValues(newState, stateFromSetter)
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
      let optimisticState = cloneObj(
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

      for (const action of actionsQueue) {
        const futurePrevState = cloneObj(newState)
        const async: Async = createAsync({
          when,
          store,
          transition: action.transition,
          signal,
          from: "action",
        })
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
          async,
          optimistic: setterOrPartialState => {
            if (signal.aborted) return
            if (!transition) return
            registerOnOptimisticSettersRegistry(
              setterOrPartialState,
              transition
            )
            applySetterOnCurrentState(
              setterOrPartialState,
              optimisticState,
              optimisticState
            )

            notifyOptimistic(optimisticStateSource ?? newState)
          },
          set: setterOrPartialState => {
            if (signal.aborted) return
            props?.onSet?.(setterOrPartialState)
            if (isSync) {
              if (transition) {
                updateTransitionState(transition, setterOrPartialState)
              }

              applySetterOnCurrentState(
                setterOrPartialState,
                newState,
                newState
              )
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
            props.async.promise(ctx => {
              const action = props.action as unknown as {
                transitionFn: (
                  options: TransitionFunctionOptions
                ) => Promise<any>
              }
              return action.transitionFn({
                transition: props.action.transition,
                signal: ctx.signal,
              })
            })
          }
          return userReducer(props)
        }
        const producedState = reducer(context)
        // looks redundant but user might return prev state
        newState = producedState
        prevState = futurePrevState
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
      transition: any[],
      newSetterOrPartialState: SetterOrPartialState<TState> | null
    ) => {
      const transitionKey = transition.join(":")
      const setter = newSetterOrPartialState
        ? ensureSetter(newSetterOrPartialState)
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

      function updateTransitionState(
        setterOrPartialStateList: SetterOrPartialState<TState>[]
      ) {
        const newState = cloneObj(store.state)
        setterOrPartialStateList.forEach(setterOrPartialState => {
          applySetterOnCurrentState(setterOrPartialState, newState, newState)
        })

        return newState
      }

      function getAncestorSettersOfTransition(
        transitionAncestor: any[]
      ): SetterOrPartialState<TState>[] {
        const transitionKey = transitionAncestor.join(":")
        return Object.entries(store.settersRegistry)
          .filter(([key]) => key.startsWith(transitionKey))
          .flatMap(([, setters]) => setters)
      }

      createAncestor(transition).forEach(transitionAncestor => {
        const allSetters = getAncestorSettersOfTransition(transitionAncestor)
        const shouldClear = allSetters.length === 0
        const transitionAncestorKey = transitionAncestor.join(":")

        if (shouldClear) {
          store.transitionsState.setState({
            [transitionAncestorKey]: null,
          })
        } else {
          const newState = updateTransitionState(allSetters)
          /**
           * Updates the transition state
           */
          store.transitionsState.setState({
            [transitionAncestorKey]: newState,
          })
        }
      })

      log(
        `%c [${transition.join(":")}]`,
        "color: coral",
        store.transitionsState.state
      )
    }

    const handleSetStateTransitionOngoing = (
      setterOrPartialState: SetterOrPartialState<TState>,
      action: Action & { transition: any[] },
      when: string
    ) => {
      const transitionString = action.transition.join(":")
      const getTransitionState = () =>
        store.transitionsState.state[transitionString] ?? store.state
      const prevState = getTransitionState()

      // Updates the store.transitionsState
      updateTransitionState(action.transition, setterOrPartialState)

      const state = getTransitionState()

      handleAction(action, {
        when,
        state,
        prevState,
        optimisticStateSource: store.state,
      })
    }

    const handleSetStateTransitionToStart = (
      setterOrPartialState: SetterOrPartialState<TState>,
      action: Action & { transition: any[] },
      when: string
    ) => {
      const state = store.state

      const setter = ensureSetter(setterOrPartialState)
      const newPartialState = setter(state)

      handleAction(action, {
        when,
        state: mergeObj(state, newPartialState),
      })
    }

    const handleSetStateWithoutTransition = (
      setterOrPartialState: SetterOrPartialState<TState>,
      when: string
    ) => {
      const setter = ensureSetter(setterOrPartialState)
      const state = store.state
      const newPartialState = setter(state)
      const action = {
        type: "noop",
        transition: null,
      } as Action

      const actionResult = handleAction(action, {
        when,
        state: mergeObj(state, newPartialState),
      })

      const [historyLatestState, newHistory] = handleNewStateToHistory({
        state: actionResult.newState,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition: null,
            from: "set",
            store,
            action,
          }),
      })

      store.history = newHistory
      defineState(historyLatestState)

      subject.notify()
    }

    const handleSetStateWithTransition = (
      setterOrPartialState: SetterOrPartialState<TState>,
      transition: any[],
      when: string
    ) => {
      const transitionIsOngoing =
        transition && store.transitions.isHappeningUnique(transition)

      const action = {
        type: "noop",
        transition,
      } as Action

      if (transitionIsOngoing) {
        handleSetStateTransitionOngoing(
          setterOrPartialState,
          action as Action & { transition: any[] },
          when
        )
      } else {
        handleSetStateTransitionToStart(
          setterOrPartialState,
          action as Action & { transition: any[] },
          when
        )
      }
    }

    const setState: Met["setState"] = (setterOrPartialState, options) => {
      const when = labelWhen(new Date())
      if (options?.transition) {
        handleSetStateWithTransition(
          setterOrPartialState,
          options.transition,
          when
        )
      } else {
        handleSetStateWithoutTransition(setterOrPartialState, when)
      }
    }

    const rebuild: Met["rebuild"] = () => {
      return () => createStore(initialProps, config)
    }

    function notifyOptimistic(state = store.state) {
      const allSetters = Object.values(store.optimisticRegistry.get()).flat()
      store.optimisticState = calculateOptimisticState(allSetters, state)
      store.notify()
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
    }

    store = mergeObj(subject, store, methods)
    const ensureAbortController = createEnsureAbortController(store.transitions)

    function construct(
      initialProps: TInitialProps,
      config: StoreConstructorConfig<TDeps>
    ) {
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

      store.transitions.addKey(BOOTSTRAP_TRANSITION, "dispatch/new-transition")
      const bootstrapAction = {
        type: "bootstrap",
        transition: BOOTSTRAP_TRANSITION,
      } as Action
      handleRegisterTransition(bootstrapAction, store, when)

      const isAsync = isAsyncFunction(onConstruct)
      if (isAsync) {
        async function handleConstruction(ctx: AsyncPromiseProps) {
          if (ctx.signal.aborted) throw { code: 20 }
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
          when,
          BOOTSTRAP_TRANSITION,
          signal,
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
        }
      }

      store.transitions.doneKey(
        BOOTSTRAP_TRANSITION,
        {
          onFinishTransition: runSuccessCallback,
        },
        "bootstrap"
      )

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
