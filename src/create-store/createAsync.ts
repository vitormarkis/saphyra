import { EventsTuple } from "~/create-store/event-emitter"
import {
  Async,
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
): Async {
  const promise: Async["promise"] = <T>(
    promise: (props: AsyncPromiseProps) => Promise<T>
  ) => {
    if (!transition) throw errorNoTransition()
    store.transitions.addKey(transition)
    const transitionString = transition.join(":")

    async function handlePromise(promise: Promise<T>) {
      if (!transition) throw errorNoTransition()
      const transitionHasAbortedStr = `abort::${JSON.stringify(transition)}`

      let wasAborted = false
      const abortLocally = () => {
        wasAborted = true
        console.log(
          `00) cancelled: ${`${transitionString}-${stateContext.when}`}`
        )
        store.internal.events.emit("transition-completed", {
          id: `${transitionString}-${stateContext.when}`,
          status: "cancelled",
        })
      }
      const off = store.events.once(transitionHasAbortedStr).run(abortLocally)
      try {
        if (!transition) throw errorNoTransition()
        await promise
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
  }

  const timer = (callback: () => void, time = 0) => {
    if (!transition) throw errorNoTransition()
    store.transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback()
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
