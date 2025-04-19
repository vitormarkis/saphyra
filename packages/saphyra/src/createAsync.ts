import { EventsTuple } from "./event-emitter"
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
import { noop } from "./fn/noop"
import { runSuccessCallback } from "./transitions-store"
import { isNewActionError } from "./utils"

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

let times = {}
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
  signal: AbortSignal,
  from?: string
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
    const transitionString = transition.join(":")

    store.transitions.addKey(transition, `async-promise/${from}`)

    async function handlePromise(promise: Promise<T>) {
      if (!transition) throw errorNoTransition()
      const async = createAsync(
        store,
        state,
        stateContext,
        transition,
        signal,
        "for-promise-actor"
      )
      const racePromise = Promise.withResolvers<T>()

      const abortLocally = () => {
        store.internal.events.emit("transition-completed", {
          id: `${transitionString}-${stateContext.when}`,
          status: "cancelled",
        })

        racePromise.reject({ code: 20 })
      }
      // times[transition.join(":")] ??= 0
      // times[transition.join(":")]++
      const abortEventStr = `abort::${JSON.stringify(transition)}`
      const off = store.events.once(abortEventStr).run(abortLocally)
      try {
        if (!transition) throw errorNoTransition()
        promise.then(off)
        const value = await Promise.race<T>([promise, racePromise.promise])
        onSuccess(value, {
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(
          transition,
          {
            onFinishTransition: runSuccessCallback,
          },
          "async-promise/on-success"
        )
      } catch (error) {
        if (!isNewActionError(error)) {
          store.transitions.emitError(transition, error)
        }
        store.transitions.doneKey(
          transition,
          {
            onFinishTransition: noop,
          },
          "async-promise/on-error"
        )
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
    time = 0,
    id?: string
  ) => {
    if (!transition) throw errorNoTransition()
    const async = createAsync(
      store,
      state,
      stateContext,
      transition,
      signal,
      "for-timer-actor"
    )
    store.transitions.addKey(transition, `async-timer/${from}`)
    const abortEventStr = `abort::${JSON.stringify(transition)}`
    const off = store.events.once(abortEventStr).run(abortLocally)

    const timerId = setTimeout(() => {
      try {
        callback({
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(
          transition,
          {
            onFinishTransition: runSuccessCallback,
          },
          "async-timer/on-success"
        )
        const meta = store.transitions.meta.get(transition)
        if (meta.timers) {
          meta.timers = meta.timers.filter(
            ([arrTimerId]: [NodeJS.Timeout, string]) => arrTimerId !== timerId
          )
        }
      } catch (error) {
        console.log(
          "%cSomething went wrong! Rolling back the store state. [TODO]",
          "color: palevioletred"
        )
        store.transitions.doneKey(
          transition,
          {
            onFinishTransition: noop,
          },
          "async-timer/on-error"
        ) // TODO
        store.transitions.emitError(transition, error)
      } finally {
        off()
      }
    }, time)

    function abortLocally() {
      clearTimeout(timerId)
      store.transitions.doneKey(
        transition,
        {
          onFinishTransition: () => {},
        },
        "clean-up-transition/timer"
      )
    }

    return () => {}
  }

  return {
    promise,
    timer,
  }
}
