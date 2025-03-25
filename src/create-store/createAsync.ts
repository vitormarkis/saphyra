import { EventsTuple } from "~/create-store/event-emitter"
import {
  Async,
  AsyncActor,
  AsyncPromiseProps,
  BaseAction,
  StateContext,
  DefaultActions,
  Dispatch,
  PromiseResult,
  SomeStore,
} from "./types"
import { noop } from "~/create-store/fn/noop"
import { runSuccessCallback } from "~/create-store/transitions-store"

export const errorNoTransition = () =>
  new Error(
    "No transition! If you want to deal with async operations in your reducer, you must pass a transition to your action."
  )

/**
 * Comportamento deve ser mudado no futuro caso a store comece a
 * dar suporte a subtransitions dentro de transitions
 */
function createTransitionDispatch<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  transition: any[] | null | undefined
): Dispatch<TState, TActions> {
  return function dispatch(action: TActions) {
    store.dispatch({
      ...action,
      transition,
    })
  }
}

export function createAsync<
  TState extends Record<string, any> = Record<string, any>,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  state: TState,
  stateContext: StateContext,
  transition: any[] | null | undefined,
  signal: AbortSignal
): Async<TState, TActions> {
  type AsyncInner = Async<TState, TActions>
  type AsyncActorInner = AsyncActor<TState, TActions>
  const dispatch: AsyncActorInner["dispatch"] = createTransitionDispatch(
    store,
    transition
  )
  const set: AsyncActorInner["set"] = setter => {
    store.registerSet(setter, state, store.stateContext, transition, "reducer")
  }
  type PromiseResult<T, TState, TActions extends BaseAction<TState>> = {
    onSuccess: (
      callback: (value: T, actor: AsyncActor<TState, TActions>) => void
    ) => void
  }

  const promise: AsyncInner["promise"] = <T>(
    promise: (props: AsyncPromiseProps) => Promise<T>
  ): PromiseResult<T, TState, TActions> => {
    let onSuccess: (value: T, actor: AsyncActor<TState, TActions>) => void =
      noop
    if (!transition) throw errorNoTransition()
    store.transitions.addKey(transition)
    const transitionString = transition.join(":")

    async function handlePromise(promise: Promise<T>) {
      if (!transition) throw errorNoTransition()
      const async = createAsync(store, state, stateContext, transition, signal)
      const transitionHasAbortedStr = `abort::${JSON.stringify(transition)}`

      let wasAborted = false
      const abortLocally = () => {
        wasAborted = true
        store.internal.events.emit("transition-completed", {
          id: `${transitionString}-${stateContext.when}`,
          status: "cancelled",
        })
      }
      const off = store.events.once(transitionHasAbortedStr).run(abortLocally)
      try {
        if (!transition) throw errorNoTransition()
        const value = await promise
        onSuccess(value, {
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(transition, {
          onFinishTransition: runSuccessCallback,
        })
      } catch (error) {
        if (wasAborted) return
        store.transitions.emitError(transition, error)
        store.transitions.doneKey(transition, {
          onFinishTransition: noop,
        })
      } finally {
        off()
      }
    }
    handlePromise(promise({ signal }))

    return {
      onSuccess(onSuccessCallback) {
        onSuccess = onSuccessCallback
      },
    }
  }

  const timer = (
    callback: (actor: AsyncActor<TState, TActions>) => void,
    time = 0
  ) => {
    if (!transition) throw errorNoTransition()
    const async = createAsync(store, state, stateContext, transition, signal)
    store.transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback({
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(transition, {
          onFinishTransition: runSuccessCallback,
        })
      } catch (error) {
        console.log(
          "%cSomething went wrong! Rolling back the store state. [TODO]",
          "color: palevioletred"
        )
        store.transitions.doneKey(transition, {
          onFinishTransition: noop,
        }) // TODO
        store.transitions.emitError(transition, error)
      }
    }, time)
  }

  return {
    promise,
    timer,
  }
}
