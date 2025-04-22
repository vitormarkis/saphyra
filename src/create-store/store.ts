import { createDiffOnKeyChange } from "../diff"
import { createSubject } from "../Subject"
import { RemoveDollarSignProps } from "../types"
import { createAsync, errorNoTransition } from "./createAsync"
import { defaultErrorHandler } from "../default-error-handler"
import { runSuccessCallback, TransitionsStore } from "./transitions-store"
import {
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
  isSetter,
  newSetter,
  ReducerSet,
  Setter,
  SetterOrPartialState,
  SomeStore,
  StoreErrorHandler,
  StoreInstantiator,
  StoreInternalEvents,
} from "./types"
import { EventEmitter, EventsTuple } from "~/create-store/event-emitter"
import { createDebugableShallowCopy, isAsyncFunction } from "~/lib/utils"
import { noop } from "~/create-store/fn/noop"
import { ErrorsStore } from "~/create-store/errors-store"
import {
  createDefaultBeforeDispatch,
  isNewActionError,
} from "~/create-store/utils"
import { getSnapshotAction } from "~/create-store/helpers/get-snapshot-action"
import { Rollback } from "~/create-store/helpers/rollback"
import invariant from "tiny-invariant"
import { GENERAL_TRANSITION } from "~/create-store/const"
import { assignObjValues, cloneObj, mergeObj } from "./helpers/obj-descriptors"

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
  async: Async
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  events: EventEmitter<TEvents>
  set: ReducerSet<TState>
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
  from: "dispatch" | "set" | "rerender"
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
      state: {} as TState,
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

    const getState: Met["getState"] = () => store.state

    const defineState = (newState: TState) => {
      if (newState === undefined) debugger
      store.state = newState
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

      store.settersRegistry = {
        ...store.settersRegistry,
        [transitionKey]: [],
      }
      const newStateFromSetters = setters.reduce((acc: TState, setter) => {
        setter = mergeSetterWithState(ensureSetter(setter))
        const newState = setter(acc)
        return mergeObj(acc, newState) as TState
      }, cloneObj(store.state))

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

    function ensureAbortController(props: {
      transition: any[]
      controller?: AbortController | null | undefined
    }): AbortController {
      const key = props.transition.join(":")
      let controller = store.transitions.controllers.get(key)
      if (controller != null) return controller
      controller = props.controller ?? new AbortController()
      store.transitions.controllers.set(props.transition, controller)
      return controller
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
      const transitionString = transition.join(":")
      if (transitionString === "bootstrap") {
        errorsStore.setState({ bootstrap: error })
      }
      if (store.settersRegistry[transitionString] != null) {
        store.settersRegistry = {
          ...store.settersRegistry,
          [transitionString]: [],
        }
      }
      const newActionAbort = isNewActionError(error)
      if (!newActionAbort) {
        handleError(error, transition)
        console.log(`%cTransition failed! [${transitionString}]`, "color: red")
      } else {
        console.log(
          `%cPrevious transition canceled! [${transitionString}], creating new one.`,
          "color: orange"
        )
      }
    }

    const handleRegisterTransition = (
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
          // @ts-expect-error
          store.events.emit(`abort::${JSON.stringify(action.transition)}`, null)

          store.transitions.eraseKey(action.transition, {
            onFinishTransition: noop,
          })
          cleanUpTransition(action.transition, {
            code: 20,
          })
        }

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

      const rootAction = beforeDispatch({
        action: getSnapshotAction(initialAction),
        meta: store.transitions.meta.get(initialAction.transition),
        transitionStore: store.transitions,
        transition: initialAction.transition,
        events: store.events,
      }) as TActions

      if (rootAction == null) throw rollback

      handleRegisterTransition(rootAction, store, stateContext, rollback)

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
        state: newState,
        stateContext,
      })
      newState = handledDispatch.newState
      stateContext = handledDispatch.stateContext

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
      const actionResult = handleAction({ type: "noop" } as TActions)
      const [historyLatestState, newHistory] = handleNewStateToHistory({
        state: actionResult.newState,
        getNewHistoryStack: state =>
          onPushToHistory({
            history: store.history,
            state,
            transition: null,
            from: "rerender",
            store,
          }),
      })

      store.history = newHistory
      defineState(historyLatestState)

      subject.notify()
    }

    type HandleActionProps<
      TInitialProps extends Record<string, any>,
      TState extends Record<string, any> = TInitialProps,
      TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
    > = {
      state?: TState
      prevState?: TState
      stateContext?: StateContext
      createAsync?: (props: InnerCreateAsync) => Async
      onSet?: (setterOrPartialState: SetterOrPartialState<TState>) => void
    }

    type InnerCreateAsync = {
      store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
      state: TState
      stateContext: StateContext
      transition: any[] | null | undefined
      signal: AbortSignal
    }

    const defaultInnerCreateAsync = ({
      store,
      state,
      stateContext,
      transition,
      signal,
    }: InnerCreateAsync) => {
      return createAsync(store, state, stateContext, transition, signal)
    }

    const registerOnSettersRegistry = (
      setterOrPartialState: SetterOrPartialState<TState>,
      transition: any[]
    ) => {
      const transitionKey = transition.join(":")
      store.settersRegistry = {
        ...store.settersRegistry,
        [transitionKey]: [
          ...(store.settersRegistry[transitionKey] ?? []),
          setterOrPartialState,
        ],
      }
    }

    const applySetterOnCurrentState = (
      setterOrPartialState: SetterOrPartialState<TState>,
      newState: TState
    ) => {
      const setter = ensureSetter(setterOrPartialState)
      const stateFromSetter = setter(newState)
      assignObjValues(newState, stateFromSetter)
    }

    const handleAction = (
      rootAction: TActions & BaseAction<TState>,
      props?: HandleActionProps<TInitialProps, TState, TActions>
    ) => {
      let stateContext = cloneObj(props?.stateContext ?? store.stateContext)
      let newState = cloneObj(props?.state ?? store.state)
      let prevState = props?.prevState ?? store.state
      const { createAsync = defaultInnerCreateAsync } = props ?? {}

      const transition = rootAction.transition ?? [GENERAL_TRANSITION]
      const controller = ensureAbortController({
        transition,
        controller: rootAction.controller,
      })

      let isSync = true
      const actionsQueue: TActions[] = [rootAction]

      for (const action of actionsQueue) {
        const futurePrevState = cloneObj(newState)
        const async: Async = createAsync({
          state: newState,
          stateContext,
          store,
          transition: action.transition,
          signal: controller.signal,
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
          set: setterOrPartialState => {
            if (transition)
              registerOnSettersRegistry(setterOrPartialState, transition)

            if (isSync) {
              applySetterOnCurrentState(setterOrPartialState, newState)
              props?.onSet?.(setterOrPartialState)
            } else {
              const setter = ensureSetter(setterOrPartialState)
              const stateFromSetter = setter(newState)
              store.setState(stateFromSetter, { transition })
            }
          },
          diff: createDiff(prevState, newState),
          dispatch: (action: TActions) => {
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
              return props.action.transitionFn({
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
      return {
        newState,
        prevState,
        stateContext,
      }
    }

    const setState: Met["setState"] = (newPartialState, options) => {
      const action = {
        type: "noop",
        transition: options?.transition,
      } as TActions
      const actionResult = handleAction(action, {
        state: mergeObj(store.state, newPartialState),
      })

      const transitionIsOngoing =
        options?.transition &&
        store.transitions.isHappeningUnique(options.transition)

      if (transitionIsOngoing) {
      } else {
        const [historyLatestState, newHistory] = handleNewStateToHistory({
          state: actionResult.newState,
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
    }

    const rebuild: Met["rebuild"] = () => {
      return () => createStore(initialProps, config)
    }

    const methods: Met = {
      getState,
      dispatch,
      setState,
      registerErrorHandler,
      handleError,
      undo,
      redo,
      rerender,
      rebuild,
      completeTransition,
      commitTransition,
      handleAction,
    }

    store = mergeObj(subject, store, methods)

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

        async.promise(async ctx => {
          const pureState = await handleConstruction(ctx)
          const initialState = pureState as TState
          const handledDispatch = handleAction(
            {
              type: "noop",
              transition: BOOTSTRAP_TRANSITION,
            } as TActions,
            {
              prevState,
              state: initialState,
              stateContext: prevStateContext,
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

          const { newState: processedState } = handleAction(bootstrapAction, {
            state: initialState,
            prevState,
            stateContext: prevStateContext,
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
