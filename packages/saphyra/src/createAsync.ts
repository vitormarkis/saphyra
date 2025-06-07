import { EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { runSuccessCallback } from "./transitions-store"
import {
  ActionShape,
  AsyncBuilder,
  AsyncModule,
  AsyncPromiseConfig,
  AsyncPromiseOnFinishProps,
  AsyncPromiseProps,
  AsyncTimerConfig,
  BaseAction,
  DefaultActions,
  OnFinishCallback,
  OnFinishId,
  SomeStore,
  SomeStoreGeneric,
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
  transition: any[] | null | undefined,
  signal: AbortSignal,
  from?: string,
  onAbort?: () => void
): AsyncBuilder {
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

  const promiseInternal = <T>(
    promiseFn: (props: AsyncPromiseProps) => Promise<T>,
    config?: AsyncPromiseConfig
  ) => {
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

      const cleanSubtransitionDoneEvent = store.transitions.allEvents.on(
        "subtransition-done",
        id => {
          if (label !== id) return
          cleanSubtransitionDoneEvent()
        }
      )

      const racePromise = PromiseWithResolvers<T>()

      const finishBar = newBar(transitionString, labelWhen(new Date()), label)

      const cleanUp = (error: unknown) => {
        // if (onSuccess) {
        //   store.transitions.finishCallbacks.success.delete(onSuccess.id)
        // }
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
      cleanUpList.add(cleanUp)
      if (!transition) throw errorNoTransition()
      try {
        if (!transition) throw errorNoTransition()
        if (label) store.transitions.addSubtransition(label)
        await Promise.race<T>([promise, racePromise.promise])
        if (label) store.transitions.doneSubtransition(label)
        finishBar("success")
        cleanUpList.delete(cleanUp)
        store.transitions.doneKey(
          transition,
          { onFinishTransition: runSuccessCallback },
          "async-promise/on-success"
        )
      } catch (error) {
        if (label) store.transitions.doneSubtransition(label)
        const aborted = isNewActionError(error)
        if (aborted) {
          onAbort?.()
          return
        }
        store.transitions.emitError(transition, error)
      }
    }
    handlePromise(promiseFn({ signal }))
  }

  const timerInternal = (
    callback: () => void,
    time = 0,
    config?: AsyncTimerConfig
  ) => {
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
      if (aborted) {
        onAbort?.()
      }
      finishBar(aborted ? "cancelled" : "fail", error)

      store.transitions.doneKey(
        transition,
        { onFinishTransition: () => {} },
        `async-timer/${aborted ? "cancel" : "on-error"}`
      )
    }
  }

  return () => {
    let _name: string | null = null

    const promise = <T>(
      promiseFn: (props: AsyncPromiseProps) => Promise<T>
    ) => {
      promiseInternal(promiseFn, {
        label: _name ?? undefined,
      })

      return {
        onFinish: ({ fn, id }: AsyncPromiseOnFinishProps) => {
          if (!_name)
            throw new Error(
              "Name is required when using async().promise.onFinish, call .setName before .promise"
            )

          return () => fn(true, noop, noop)
        },
      }
    }

    const timer = (
      callback: () => void,
      time?: number,
      config?: AsyncTimerConfig
    ) => {
      timerInternal(callback, time, config)
    }

    const setName: AsyncModule["setName"] = name => {
      _name = Array.isArray(name) ? name.join(":") : name

      return {
        promise,
        timer,
      }
    }

    return {
      promise,
      timer,
      setName,
    }
  }
}
