import _, { has } from "lodash"
import { createDiffOnKeyChange } from "../diff"
import { createSubject, Subject } from "../Subject"
import { RemoveDollarSignProps } from "../types"
import { createAsync, errorNoTransition } from "./createAsync"
import { defaultErrorHandler } from "./fn/default-error-handler"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  AsyncPromiseProps,
  BaseAction,
  BaseState,
  CleanUpTransitionConfig,
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
  TransitionFunctionOptions,
} from "./types"
import { EventEmitter, EventsTuple } from "~/create-store/event-emitter"
import { createDebugableShallowCopy, isAsyncFunction, nonNullable } from "~/lib/utils"
import { noop } from "~/create-store/fn/noop"
import { ErrorsStore } from "~/create-store/errors-store"
import { createDefaultBeforeDispatch, isNewActionError } from "~/create-store/utils"
import { getSnapshotAction } from "~/create-store/helpers/get-snapshot-action"

export type ExternalProps = Record<string, any> | null

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  initialProps: TInitialProps
  store: SomeStore<TState, TActions, TEvents>
  signal: AbortSignal
}

type OnConstruct<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple
> = (
  props: OnConstructProps<TInitialProps, TState, TActions, TEvents>,
  config?: StoreConstructorConfig
) => RemoveDollarSignProps<TState> | Promise<RemoveDollarSignProps<TState>>

function defaultOnConstruct<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple
>(
  props: OnConstructProps<TInitialProps, TState, TActions, TEvents>,
  _config?: StoreConstructorConfig
) {
  const state = props.initialProps as unknown as TState
  return { ...state }
}

//

/**
 * Reducer
 */
type ReducerProps<
  TState,
  TActions extends BaseAction<TState> & DefaultActions,
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

export type Reducer<TState, TActions extends BaseAction<TState>, TEvents extends EventsTuple> = (
  props: ReducerProps<TState, TActions, TEvents>
) => TState

function defaultReducer<TState, TActions extends BaseAction<TState>, TEvents extends EventsTuple>(
  props: ReducerProps<TState, TActions, TEvents>
) {
  return props.state
}

export type ExternalPropsFn<TExternalProps> = (() => Promise<TExternalProps>) | null

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  onConstruct?: OnConstruct<TInitialProps, TState, TActions, TEvents>
  reducer?: Reducer<TState, TActions, TEvents>
}

export type StoreConstructorConfig = {
  errorHandlers?: StoreErrorHandler[]
}

const BOOTSTRAP_TRANSITION = ["bootstrap"]

export function newStoreDef<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
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
    const errorsStore = new ErrorsStore()

    const storeValues: GenericStoreValues<TState, TEvents> = {
      errors: errorsStore,
      transitions: new TransitionsStore(),
      events: new EventEmitter(),
      history: [],
      historyRedo: [],
      errorHandlers: new Set(),
      settersRegistry: {},
      state: {} as TState,
    }
    let store = createDebugableShallowCopy(
      storeValues as unknown as SomeStore<TState, TActions, TEvents>,
      "state"
    )

    const createDiff = (oldState: TState, newState: TState) => {
      const [, diff] = createDiffOnKeyChange(oldState, newState)
      return diff
    }

    const createSetScheduler: Met["createSetScheduler"] = (
      newState,
      mergeType = "set",
      transition = null
    ): ReducerSet<TState> => {
      return setterOrPartialState =>
        store.registerSet(setterOrPartialState, newState, transition, mergeType)
    }

    const getState: Met["getState"] = () => store.state
    const defineState = (newState: TState) => {
      store.state = newState
    }

    const commitTransition = (
      transition: any[] | null | undefined,
      onTransitionEnd?: (state: TState) => void
    ) => {
      console.log("66x: COMITTING TRANSITION")

      if (!transition) {
        debugger
        throw errorNoTransition()
      }
      const transitionKey = transition.join(":")
      const setters = store.settersRegistry[transitionKey] ?? []
      console.log("66: Comitting transition with setters!", setters)
      if (!setters) {
        console.log(
          "No setters found for this transition. It's most likely you didn't use the `set` function in your reducer."
        )
      }

      store.settersRegistry[transitionKey] = []
      const newState = setters.reduce(
        (acc: TState, setter) => {
          setter = mergeSetterWithState(ensureSetter(setter))
          const newState = setter(acc)
          return { ...acc, ...newState }
        },
        { ...store.state }
      )
      console.log("66: COMITTING TRANSITION", {
        setters,
        prevState: store.state,
        newState,
      })

      defineState(newState)
      store.history.push(newState)
      store.historyRedo = []
      onTransitionEnd?.(newState)
      subject.notify()
    }

    function completeTransition(action: GenericAction, transition: any[]) {
      const transitionString = transition.join(":")
      if (!transition) throw new Error("Impossible to reach this point")
      console.log(`%cTransition completed! [${transitionString}]`, "color: lightgreen")
      commitTransition(transition, action.onTransitionEnd)
      store.transitions.cleanup(transitionString)
    }

    const cleanUpTransition = (transition: any[], error: unknown | null) => {
      // store.transitions.doneKey(transition, config)
      // store.transitions.doneKey(transition)

      const transitionString = transition.join(":")
      if (transitionString === "bootstrap") {
        errorsStore.setState({ bootstrap: error })
      }
      store.settersRegistry[transitionString] = []
      console.log("66: CLEAN UP TRANSITION")
      const newActionAbort = isNewActionError(error)
      if (!newActionAbort) {
        console.log(`%cTransition failed! [${transitionString}]`, "color: red")
        handleError(error, transition)
      } else {
        console.log(
          `%cPrevious transition canceled! [${transitionString}], creating new one.`,
          "color: orange"
        )
      }
      store.transitions.cleanup(transitionString)
    }

    const handleRegisterTransition = (
      newState: TState & BaseState,
      initialAction: TActions,
      store: SomeStore<TState, TActions, TEvents>
    ) => {
      const currentTransitionName = store.state.currentTransition?.join(":")
      const actionTransitionName = initialAction.transition?.join(":")!
      const isNewTransition = currentTransitionName !== actionTransitionName

      if (initialAction.transition != null && isNewTransition) {
        let isRunning = store.transitions.get(initialAction.transition) > 0
        // const checkIsRunning = () => {
        //   if (!initialAction.transition) throw errorNoTransition()
        //   return store.transitions.get(initialAction.transition) > 0
        // }

        const { beforeDispatch = createDefaultBeforeDispatch() } = initialAction

        const controller = getAbortController({
          transition: initialAction.transition,
        })

        const action = beforeDispatch({
          action: getSnapshotAction(initialAction),
          meta: store.transitions.meta.get(initialAction.transition),
          transitionStore: store.transitions,
          transition: initialAction.transition,
        })

        if (action == null || action.transition == null) {
          return {
            skip: true,
          }
        }

        const hasAborted = controller.signal.aborted

        if (hasAborted) {
          store.transitions.meta.values[actionTransitionName]["$$_shouldHandleError"] = false
          // store.transitions.emitError(action.transition, { code: 20 })
          store.transitions.eraseKey(action.transition, "skip-effects")
          cleanUpTransition(action.transition, { code: 20 })
        }

        // const cleanUpTransition = createCleanUpTransition(action.transition, () => cleanupCommitTransition())

        console.log("88: hasAborted", hasAborted)

        // if (prevController) {
        //   // console.log("%cSupposed to abort transition!", "color: purple")
        //   prevController.abort()
        // }

        newState.currentTransition = action.transition
        store.transitions.controllers.values[actionTransitionName] = action.controller

        console.log("55: ADD!")

        /**
         * After running `beforeDispatch`, user may have aborted the transition,
         * which would case an error, being caught by async promise, doning the key
         * with the error, which mean the transition should not be running
         * from this point forward
         */
        // setTimeout(() => {
        // const isRunning = checkIsRunning()
        console.log(
          "66: IS RUNNING?",
          isRunning,
          store.transitions.get(initialAction.transition) > 0
        )
        isRunning = store.transitions.get(initialAction.transition) > 0
        store.transitions.addKey(initialAction.transition)
        if (!isRunning) {
          const transition = action.transition
          const transitionString = transition.join(":")

          console.log("66: REGISTERING HANDLERS!")

          store.transitions.callbacks.done.set(transitionString, () =>
            store.completeTransition(action, transition)
          )

          store.transitions.callbacks.error.set(transitionString, error => {
            cleanUpTransition(action.transition, error)
          })
        }
        // })

        // }
      }

      return { skip: false }
    }

    const dispatch: Met["dispatch"] = (initialAction: TActions) => {
      console.log("44: dispatching!")
      try {
        console.log("STORE STATE", store.state)
        let newState = { ...store.state }

        const { skip } = handleRegisterTransition(newState, initialAction, store)
        if (initialAction.transition != null && skip) {
          // store.transitions.doneKey(initialAction.transition, null)
          console.log("66: DISPATCH DONE ~~")

          return
        }

        const transitionName = initialAction.transition?.join(":")!
        const controller = initialAction.controller ?? new AbortController()
        store.transitions.controllers.values[transitionName] = controller
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
            async: createAsync(store, newState, action.transition, controller.signal),
            set: scheduleSetter,
            diff: createDiff(prevState, newState),
            dispatch: (action: TActions) => {
              actionsQueue.push({
                ...action,
                transition: initialAction.transition ?? null,
                onTransitionEnd: initialAction.onTransitionEnd ?? null,
              })
            },
          }
          const reducer: Reducer<TState, TActions, TEvents> = (
            context: ReducerProps<TState, TActions, TEvents>
          ) => {
            if (context.action.type === "$$lazy-value") {
              const { transition, transitionFn, onSuccess = noop } = context.action
              context.async
                .promise(async ({ signal }) => {
                  const options: TransitionFunctionOptions = {
                    transition,
                    actor: {
                      set() {
                        debugger
                      },
                      dispatch() {
                        debugger
                      },
                      async: {
                        promise() {
                          return {
                            onSuccess() {
                              debugger
                            },
                          }
                        },
                        timer() {
                          debugger
                        },
                      },
                    },
                    signal,
                  }
                  return await transitionFn(options)
                })
                .onSuccess(onSuccess)
            }
            return userReducer(context)
          }
          const producedState = reducer(context)
          // looks redundant but user might return prev state
          newState = producedState
          prevState = futurePrevState
        }

        if (initialAction.transition != null) {
          console.log("55: DONE!")
          store.transitions.doneKey(initialAction.transition)
          // the observers will be notified
          // when the transition is done
        } else {
          defineState(newState)
          subject.notify()
        }
      } catch (error) {
        handleError(error, initialAction.transition)
      }
      console.log("66: DISPATCH DONE ~~")
    }

    const handleError: Met["handleError"] = (error, transition) => {
      store.errorHandlers.forEach(handleError => {
        handleError(error, transition)
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
      defineState({ ...previousState })
      subject.notify()
    }

    const redo: Met["redo"] = () => {
      if (store.historyRedo.length <= 0) return
      store.history = [...store.history, store.historyRedo.pop()!]
      const nextState = store.history.at(-1)!
      defineState({ ...nextState })
      subject.notify()
    }

    const rerender: Met["rerender"] = () => {
      const signal = new AbortController().signal
      const result = userReducer({
        action: { type: "noop" } as TActions,
        diff: createDiff(store.state, store.state),
        state: store.state,
        async: createAsync(store, store.state, null, signal),
        set: store.createSetScheduler(store.state, "set", null),
        prevState: store.state,
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })
      defineState(result)
      subject.notify()
    }

    const registerSet: Met["registerSet"] = (
      setterOrPartialStateList,
      currentState,
      transition,
      mergeType
    ) => {
      const { signal } = getAbortController({
        controller: new AbortController(),
        transition,
      })
      if (transition) {
        const transitionKey = transition.join(":")
        store.settersRegistry[transitionKey] ??= []
        store.settersRegistry[transitionKey].push(setterOrPartialStateList)
        console.log("77: JUST PUSHED SETTER")
      }

      const setter = mergeSetterWithState(ensureSetter(setterOrPartialStateList))
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
          async: createAsync(store, newState, transition, signal),
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
        Object.assign(currentState as any, {
          [key]: newState[key],
        })
      }
    }

    const setState: Met["setState"] = (newPartialState: Partial<TState>) => {
      const newState = {
        ...store.state,
        ...newPartialState,
      }
      const action = { type: "noop" } as TActions
      const { signal } = getAbortController(action)
      const result = userReducer({
        action,
        diff: createDiff(store.state, newState),
        state: newState,
        prevState: { ...store.state },
        async: createAsync(store, newState, null, signal), // um set state pode ocasionar em chamadas assíncronas, e como isso é cancelado?
        set: store.createSetScheduler(newState, "set", null),
        events: store.events,
        store,
        dispatch: (action: TActions) => {
          console.log("dispatch", action)
        },
      })

      defineState(result)

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
      completeTransition,
    }

    store = {
      ...subject,
      ...store,
      ...methods,
    }

    type GetAbortControllerProps = {
      transition?: any[] | null | undefined
      controller?: AbortController | null | undefined
    }
    function getAbortController(props: GetAbortControllerProps): AbortController {
      if (!props.transition) return new AbortController()
      const key = props.transition.join(":")
      const controller = store.transitions.controllers.get(key)
      if (controller != null) return controller
      store.transitions.controllers.values[key] = props.controller ?? new AbortController()
      return getAbortController(props)
    }

    function construct(initialProps: TInitialProps, config: StoreConstructorConfig) {
      Object.assign(window, { _store: store })

      store.errorHandlers = config.errorHandlers
        ? new Set(config.errorHandlers)
        : new Set([defaultErrorHandler])

      const prevState = {} as TState
      // prevState.role ??= "user"
      defineState(prevState)
      const isAsync = isAsyncFunction(onConstruct)

      const bootstrapAction = {
        type: "bootstrap",
        transition: BOOTSTRAP_TRANSITION,
      } as TActions
      handleRegisterTransition(prevState, bootstrapAction, store)

      if (isAsync) {
        async function handleConstruction(ctx: AsyncPromiseProps) {
          const initialState = await onConstruct({
            initialProps,
            store,
            signal: ctx.signal,
          })

          return initialState
        }

        const { signal } = getAbortController(bootstrapAction)
        const async = createAsync(store, prevState, BOOTSTRAP_TRANSITION, signal)

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
              async: createAsync(store, initialState, BOOTSTRAP_TRANSITION, signal),
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

            // Don't use actor.set since the prevState would be the same
            // as the one returned in the onConstruct again, causing derivations to run twice
            // (set state without invoking the reducer)
            defineState(processedState)
            subject.notify()
          })
      } else {
        const { signal } = getAbortController(bootstrapAction)
        try {
          const initialState = onConstruct({
            initialProps,
            store: store,
            signal,
          }) as TState

          const processedState = userReducer({
            action: bootstrapAction,
            state: initialState,
            diff: createDiff(prevState, initialState),
            async: createAsync(store, initialState, BOOTSTRAP_TRANSITION, signal),
            set: createSetScheduler(initialState, "set", null),
            prevState,
            events: store.events,
            store,
            dispatch: (action: TActions) => {
              console.log("dispatch", action)
            },
          })

          defineState(processedState)
        } catch (error) {
          handleError(error, BOOTSTRAP_TRANSITION)
          throw error
        }
      }

      store.transitions.doneKey(BOOTSTRAP_TRANSITION)

      store.history = [store.state]
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
    return { ...currentState, ...newState }
  }
}

export function ensureSetter<TState>(setterOrPartialStateList: SetterOrPartialState<TState>) {
  return isSetter(setterOrPartialStateList)
    ? setterOrPartialStateList
    : newSetter(setterOrPartialStateList)
}
