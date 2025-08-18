import { newAsyncOperation } from "./async-operation"
import { EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { runSuccessCallback } from "./transitions-store"
import {
  ActionShape,
  AsyncBuilder,
  AsyncModule,
  AsyncOperation,
  AsyncPromiseConfig,
  AsyncPromiseOnFinishProps,
  AsyncPromiseProps,
  AsyncTimerConfig,
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
  TActions extends ActionShape = DefaultActions & ActionShape,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  _whenProp: string,
  transition: TransitionNullable,
  signal: AbortSignal,
  onAsyncOperation: (asyncOperation: AsyncOperation) => void,
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

  const wrapPromise = <T>(
    promiseFn: (props: AsyncPromiseProps) => Promise<T>,
    config?: AsyncPromiseConfig,
    onFinish?: AsyncPromiseOnFinishProps
  ) => {
    const when = Date.now()
    const fn = () => {
      const { label = null } = config ?? {}
      const onFinishId = Array.isArray(onFinish?.id)
        ? onFinish.id.join(":")
        : onFinish?.id
      const onFinishFn = onFinish?.fn
      if (!transition) throw errorNoTransition()
      store.transitions.addKey(
        transition,
        asyncOperation,
        `async-promise/${from}`
      )
      const transitionString = transition.join(":")

      /**
       * TO-DO: save when clean up was added, so if a transition fails
       * I run only the cleanups from that point backward
       */
      const cleanUpList = (store.transitions.cleanUpList[transitionString] ??=
        new Set())

      async function handlePromise(promise: Promise<T>) {
        if (!transition) throw errorNoTransition()

        // const clearSubtransitionDoneEvent = store.transitions.allEvents.on(
        //   "subtransition-done",
        //   id => {
        //     // if (label !== id) return
        //     clearSubtransitionDoneEvent()
        //   }
        // )

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
            asyncOperation,
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
            asyncOperation,
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
      // Set timeout here just to prevent sync reads/writes
      handlePromise(promiseFn({ signal }))
    }
    const asyncOperation = newAsyncOperation({
      fn,
      when,
      type: "promise",
      label: config?.label ?? null,
    })

    onAsyncOperation(asyncOperation)
  }
  const wrapTimeout = (
    callback: () => void,
    time = 0,
    config?: AsyncTimerConfig
  ) => {
    const when = Date.now()
    const fn = () => {
      const { label = null } = config ?? {}
      if (!transition) throw errorNoTransition()
      const transitionString = transition.join(":")

      const cleanUpList = (store.transitions.cleanUpList[transitionString] ??=
        new Set())

      store.transitions.addKey(
        transition,
        asyncOperation,
        `async-timer/${from}`
      )
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
            asyncOperation,
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
          asyncOperation,
          { onFinishTransition: () => {} },
          `async-timer/${aborted ? "cancel" : "on-error"}`
        )
      }
    }

    const asyncOperation = newAsyncOperation({
      fn,
      when,
      type: "timeout",
      label: config?.label ?? null,
    })
    onAsyncOperation(asyncOperation)
  }

  return () => {
    let _name: string | null = null
    let onFinishObj: undefined | AsyncPromiseOnFinishProps

    const onFinish: AsyncModule["onFinish"] = _onFinishObj => {
      if (!_name)
        throw new Error(
          "Name is required when using async().promise.onFinish, call .setName before .promise"
        )
      onFinishObj = _onFinishObj

      return {
        promise,
        timer,
      }
    }

    const promise = <T>(
      promiseFn: (props: AsyncPromiseProps) => Promise<T>
    ) => {
      wrapPromise(
        promiseFn,
        {
          label: _name ?? undefined,
        },
        onFinishObj
      )

      return {}
    }

    const timer = (callback: () => void, time?: number) => {
      wrapTimeout(callback, time, {
        label: _name ?? undefined,
      })
    }

    const setName: AsyncModule["setName"] = name => {
      _name = Array.isArray(name) ? name.join(":") : name

      return {
        promise,
        timer,
        onFinish,
      }
    }

    return {
      onFinish,
      promise,
      timer,
      setName,
    }
  }
}

function newAsync({ store }: { store: SomeStoreGeneric }) {
  createAsync({
    scope({ onBeforeAwaitPromise, onAfterAwaitPromise }) {
      // finish API
      onBeforeAwaitPromise(({ onFinish }) => {
        const id = Array.isArray(onFinish?.id)
        if (!id) return
        const cleanUpList = store.transitions.finishCallbacks.cleanUps[id]
        cleanUpList?.forEach(cleanUp => cleanUp(null))
      })
      onBeforeAwaitPromise(({ onFinish }) => {
        const id = Array.isArray(onFinish?.id)
        if (!id) return
        const cleanUp = store.transitions.addFinish(id)
        onAfterAwaitPromise(cleanUp)
        onAfterAwaitPromiseError(cleanUp)
      })
      onAfterAwaitPromiseError(({ onFinish }) => {
        const id = Array.isArray(onFinish?.id)
        if (id) store.transitions.doneFinish(id)
      })
      onAfterAwaitPromiseSuccess(({ onFinish }) => {
        const onFinishId = Array.isArray(onFinish?.id)
        const onFinishFn = onFinish?.fn

        const getFinishesCount = () =>
          store.transitions.state.finishes[onFinishId]
        const isLast = () => getFinishesCount() === 0
        const resolver = PromiseWithResolvers<void>()
        const finishCleanUp = onFinishFn?.(
          isLast,
          () => resolver.resolve(),
          () => resolver.reject()
        )
        const cleanUpStore = store.transitions.finishCallbacks.cleanUps
        cleanUpStore[onFinishId] ??= new Set()
        cleanUpStore[onFinishId].add(function listener() {
          finishCleanUp?.()
          cleanUpStore[onFinishId]?.delete(listener)
        })
        wrapPromise(
          async ctx => {
            if (ctx.signal.aborted) return
            ctx.signal.addEventListener("abort", () => {
              resolver.reject()
            })
            await resolver.promise
          },
          {
            label: onFinishId,
          }
        )
      })
    },
  })
}
