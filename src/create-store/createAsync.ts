import { EventsTuple } from "~/create-store/event-emitter"
import {
  Async,
  AsyncActor,
  AsyncPromiseProps,
  BaseAction,
  BaseState,
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
  TUncontrolledState,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState>,
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
  TState = BaseState,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState = any,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState>,
  state: TState,
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
    store.registerSet(setter, state, transition, "reducer")
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

    async function handlePromise(promise: Promise<T>) {
      if (!transition) throw errorNoTransition()
      const async = createAsync(store, state, transition, signal)
      const transitionHasAbortedStr = `abort::${JSON.stringify(transition)}`

      let wasAborted = false
      const abortLocally = () => {
        wasAborted = true
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
    const async = createAsync(store, state, transition, signal)
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
