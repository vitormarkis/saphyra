import { EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { runSuccessCallback } from "./transitions-store"
import {
  ActionShape,
  Async,
  AsyncOperation,
  AsyncPromiseConfig,
  AsyncPromiseProps,
  AsyncTimerConfig,
  BaseAction,
  DefaultActions,
  SomeStore,
  TransitionNullable,
} from "./types"
import { isNewActionError, labelWhen } from "./utils"

export const errorNoTransition = () =>
  new Error(
    "No transition! If you want to deal with async operations in your reducer, you must pass a transition to your action."
  )

export function createAsync<
  TState extends Record<string, any> = Record<string, any>,
  TActions extends ActionShape<TState, TEvents> = DefaultActions &
    ActionShape<TState, any>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  _whenProp: string,
  transition: TransitionNullable,
  signal: AbortSignal,
  onAsyncOperation: (asyncOperation: AsyncOperation) => void,
  from?: string
): Async {
  const completeBar = (
    id: string,
    status: "cancelled" | "fail" | "success",
    error?: unknown
  ) => {
    store.internal.events.emit("transition-completed", {
      id,
      status,
      error,
    })
  }

  const newBar = (
    transitionString: string,
    when: string,
    label: string | null
  ) => {
    const id = `${transitionString}-${when}`
    store.internal.events.emit("new-transition", {
      id,
      transitionName: transitionString,
      label,
    })

    return (status: "cancelled" | "fail" | "success", error?: unknown) =>
      completeBar(id, status, error)
  }

  const promise: Async["promise"] = <T>(
    promise: (props: AsyncPromiseProps) => Promise<T>,
    config?: AsyncPromiseConfig
  ) => {
    const when = Date.now()
    const fn = () => {
      const { label = null } = config ?? {}
      if (!transition) throw errorNoTransition()
      store.transitions.addKey(transition, `async-promise/${from}`)
      const transitionString = transition.join(":")

      /**
       * TO-DO: save when clean up was added, so if a transition fails
       * I run only the cleanups from that point backward
       */
      const cleanUpList = (store.transitions.cleanUpList[transitionString] ??=
        new Set())

      async function handlePromise(promise: Promise<T>) {
        if (!transition) throw errorNoTransition()
        const racePromise = PromiseWithResolvers<T>()

        const finishBar = newBar(transitionString, labelWhen(new Date()), label)

        cleanUpList.add(cleanUp)
        if (!transition) throw errorNoTransition()
        try {
          if (!transition) throw errorNoTransition()
          await Promise.race<T>([promise, racePromise.promise])
          finishBar("success")
          cleanUpList.delete(cleanUp)
          store.transitions.doneKey(
            transition,
            { onFinishTransition: runSuccessCallback },
            "async-promise/on-success"
          )
        } catch (error) {
          const aborted = isNewActionError(error)
          if (aborted) return
          store.transitions.emitError(transition, error)
        }

        function cleanUp(error: unknown) {
          cleanUpList.delete(cleanUp)

          const aborted = isNewActionError(error)
          finishBar(aborted ? "cancelled" : "fail", error)

          store.transitions.doneKey(
            transition,
            { onFinishTransition: noop },
            `async-promise/${aborted ? "cancel" : "on-error"}`
          )
          if (aborted) {
            racePromise.reject({ code: 20 })
          }
        }
      }
      handlePromise(promise({ signal }))
    }

    onAsyncOperation({
      fn,
      when,
      type: "promise",
      label: config?.label ?? null,
      whenReadable: labelWhen(when),
    })
  }

  const timer = (callback: () => void, time = 0, config?: AsyncTimerConfig) => {
    const when = Date.now()
    const fn = () => {
      const { label = null } = config ?? {}
      if (!transition) throw errorNoTransition()
      const transitionString = transition.join(":")

      const cleanUpList = (store.transitions.cleanUpList[transitionString] ??=
        new Set())

      store.transitions.addKey(transition, `async-timer/${from}`)
      cleanUpList.add(cleanUp)
      const when = labelWhen(new Date())
      const finishBar = newBar(transitionString, when, label)
      const timerId = setTimeout(() => {
        try {
          callback()
          finishBar("success")
          cleanUpList.delete(cleanUp)
          store.transitions.doneKey(
            transition,
            { onFinishTransition: runSuccessCallback },
            "async-timer/on-success"
          )
        } catch (error) {
          store.transitions.emitError(transition, error)
        }
      }, time)

      function cleanUp(error: unknown | null) {
        cleanUpList.delete(cleanUp)
        clearTimeout(timerId)

        const aborted = isNewActionError(error)
        finishBar(aborted ? "cancelled" : "fail", error)

        store.transitions.doneKey(
          transition,
          { onFinishTransition: () => {} },
          `async-timer/${aborted ? "cancel" : "on-error"}`
        )
      }
    }

    onAsyncOperation({
      fn,
      when,
      type: "timeout",
      label: config?.label ?? null,
      whenReadable: labelWhen(when),
    })
  }

  return {
    promise,
    timer,
  }
}
