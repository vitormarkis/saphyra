import { newAsyncOperation } from "./async-operation"
import { EventsTuple } from "./event-emitter"
import { noop } from "./fn/noop"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { QueueManager } from "./queue-manager"
import { runSuccessCallback } from "./transitions-store"
import {
  ActionShape,
  AsyncBuilder,
  AsyncModule,
  AsyncOperation,
  AsyncPromiseConfig,
  AsyncPromiseOnFinishProps,
  AsyncPromiseProps,
  AsyncSetTimeoutProps,
  AsyncTimerConfig,
  DefaultActions,
  QueueId,
  SomeStore,
  SomeStoreGeneric,
  StoreInternalContextEnum,
  Transition,
  TransitionNullable,
} from "./types"
import { isAbortError, labelWhen } from "./utils"

export const errorNoTransition = () =>
  new Error(
    "No transition! Your reducer triggered async operations without a transition. Add one to your action or set a default transition on your store definition."
  )

type CreateAsyncProps<
  TState extends Record<string, any> = Record<string, any>,
  TActions extends ActionShape = DefaultActions & ActionShape,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
> = {
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  when: string
  transition: TransitionNullable
  signal: AbortSignal
  onAsyncOperation: (asyncOperation: AsyncOperation) => void
  from?: string
  onAbort?: () => void
  queueManager?: QueueManager
}

export function createAsync<
  TState extends Record<string, any> = Record<string, any>,
  TActions extends ActionShape = DefaultActions & ActionShape,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  props: CreateAsyncProps<TState, TActions, TEvents, TUncontrolledState, TDeps>
): AsyncBuilder
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
  onAbort?: () => void,
  queueManager?: QueueManager
): AsyncBuilder
export function createAsync<
  TState extends Record<string, any> = Record<string, any>,
  TActions extends ActionShape = DefaultActions & ActionShape,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  storeOrProps:
    | SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
    | CreateAsyncProps<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  _whenProp?: string,
  transition?: TransitionNullable,
  signal?: AbortSignal,
  onAsyncOperation?: (asyncOperation: AsyncOperation) => void,
  from?: string,
  onAbort?: () => void,
  queueManager?: QueueManager
): AsyncBuilder {
  let store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>

  if ("store" in storeOrProps) {
    store = storeOrProps.store
    _whenProp = storeOrProps.when
    transition = storeOrProps.transition
    signal = storeOrProps.signal
    onAsyncOperation = storeOrProps.onAsyncOperation
    from = storeOrProps.from
    onAbort = storeOrProps.onAbort
    queueManager = storeOrProps.queueManager
  } else {
    store = storeOrProps
  }

  if (!signal || !onAsyncOperation) {
    throw new Error("signal and onAsyncOperation are required")
  }
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
    label: string | null,
    kind: "queue" | "onFinish" | "user" = "user"
  ) => {
    const id = `${transitionString}-${when}`
    store.internal.events.emit("new-transition", {
      id,
      transitionName: transitionString,
      label,
      kind,
    })

    return (status: "cancelled" | "fail" | "success", error?: unknown) => {
      completeBar(id, status, error)
    }
  }

  const wrapPromise = <T>(
    promiseFn: (props: AsyncPromiseProps) => Promise<T>,
    config?: AsyncPromiseConfig,
    onFinish?: AsyncPromiseOnFinishProps,
    emitBar?: boolean
  ) => {
    const when = Date.now()
    const fn = () => {
      const { label = null } = config ?? {}
      const onFinishId = Array.isArray(onFinish?.id)
        ? onFinish.id.join(":")
        : onFinish?.id
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

        const finishBar = emitBar
          ? newBar(transitionString, labelWhen(new Date()), label)
          : () => {}

        const cleanUp = (error: unknown) => {
          // if (onSuccess) {
          //   store.transitions.finishCallbacks.success.delete(onSuccess.id)
          // }
          cleanUpList.delete(cleanUp)

          const aborted = isAbortError(error)
          finishBar(aborted ? "cancelled" : "fail", error)

          store.transitions.doneKey(
            transition,
            asyncOperation,
            { onFinishTransition: noop, skipDoneEvent: !aborted },
            `async-promise/${aborted ? "cancel" : "on-error"}`
          )
          if (aborted) {
            racePromise.reject({ code: 20 })
          }
        }
        cleanUpList.add(cleanUp)

        if (!transition) throw errorNoTransition()

        // Get the shared cleanup list for onFinish resolvers
        const onFinishCleanUpRegistry =
          (store.internal.onFinishCleanUpRegistry ??= {})
        const onFinishCleanUpList = onFinishId
          ? (onFinishCleanUpRegistry[onFinishId] ??= [])
          : undefined

        const runOnFinishCallback = createRunOnFinishCallback({
          store,
          newBar,
          transition,
          wrapPromise,
        })
        try {
          if (!transition) throw errorNoTransition()
          if (onFinishId) {
            const finishCleanUpList =
              store.transitions.finishCallbacks.cleanUps[onFinishId]

            // @ts-expect-error - TODO: fix this
            finishCleanUpList?.forEach(cleanUp => cleanUp(transition))
          }

          if (label) store.transitions.addSubtransition(label)
          if (onFinishId) store.transitions.addFinish(onFinishId)
          await Promise.race<T>([promise, racePromise.promise])
          if (label) store.transitions.doneSubtransition(label)
          if (onFinishId) store.transitions.doneFinish(onFinishId)

          // Resolve all hanging onFinish resolvers BEFORE adding new ones
          if (onFinishCleanUpList) {
            onFinishCleanUpList.forEach(fn => fn(null))
            onFinishCleanUpList.length = 0
          }

          if (onFinish) {
            runOnFinishCallback({
              onFinish,
              error: undefined,
              cleanUpList,
            })
          }
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
          if (onFinishId) {
            store.transitions.doneFinish(onFinishId)
            store.transitions.rejectPendingResolvers(onFinishId, error)
          }

          const aborted = isAbortError(error)
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
      fnUser: promiseFn,
      when,
      type: "promise",
      label: config?.label ?? null,
    })

    onAsyncOperation(asyncOperation)
  }
  const wrapTimeout = (
    callback: ({ signal }: AsyncSetTimeoutProps) => void,
    time = 0,
    config?: AsyncTimerConfig,
    emitBar?: boolean
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
        `async-setTimeout/${from}`
      )
      cleanUpList.add(cleanUp)
      const when = labelWhen(new Date())
      const finishBar = emitBar
        ? newBar(transitionString, when, label)
        : () => {}
      const timerId = setTimeout(() => {
        try {
          callback({ signal })
          finishBar("success")
          cleanUpList.delete(cleanUp)
          store.transitions.doneKey(
            transition,
            asyncOperation,
            { onFinishTransition: runSuccessCallback },
            "async-setTimeout/on-success"
          )
        } catch (error) {
          store.transitions.emitError(transition, error)
        }
      }, time)

      function cleanUp(error: unknown | null) {
        cleanUpList.delete(cleanUp)
        clearTimeout(timerId)

        const aborted = isAbortError(error)
        if (aborted) {
          onAbort?.()
        }
        finishBar(aborted ? "cancelled" : "fail", error)

        store.transitions.doneKey(
          transition,
          asyncOperation,
          { onFinishTransition: () => {}, skipDoneEvent: !aborted },
          `async-setTimeout/${aborted ? "cancel" : "on-error"}`
        )
      }
    }

    const asyncOperation = newAsyncOperation({
      fn,
      fnUser: callback,
      when,
      type: "timeout",
      label: config?.label ?? null,
    })
    onAsyncOperation(asyncOperation)
  }

  return () => {
    let _name: string | null = null
    let _queueId: string | null = null
    let onFinishObj: undefined | AsyncPromiseOnFinishProps

    const onFinish: AsyncModule["onFinish"] = _onFinishObj => {
      onFinishObj = _onFinishObj

      return {
        promise,
        setTimeout,
      }
    }

    const promise = <T>(
      promiseFn: (props: AsyncPromiseProps) => Promise<T>
    ) => {
      if (_queueId && queueManager && transition) {
        wrapQueuedPromise(promiseFn, _queueId, transition, onFinishObj, _name)
      } else {
        wrapPromise(
          promiseFn,
          {
            label: _name ?? undefined,
          },
          onFinishObj,
          true
        )
      }

      return {}
    }

    const setTimeout = (
      callback: ({ signal }: AsyncSetTimeoutProps) => void,
      time?: number
    ) => {
      wrapTimeout(
        callback,
        time,
        {
          label: _name ?? undefined,
        },
        true
      )
    }

    const setName: AsyncModule["setName"] = name => {
      _name = Array.isArray(name) ? name.join(":") : name

      return {
        promise,
        setTimeout,
        onFinish,
        queue,
      }
    }

    const queue: AsyncModule["queue"] = (id: QueueId) => {
      _queueId = Array.isArray(id) ? id.join(":") : id

      return {
        promise,
        setTimeout,
        onFinish,
      }
    }

    function wrapQueuedPromise<T>(
      promiseFn: (props: AsyncPromiseProps) => Promise<T>,
      queueId: string,
      trans: Transition,
      onFinish?: AsyncPromiseOnFinishProps,
      label?: string | null
    ) {
      if (!queueManager) return

      const when = Date.now()
      let queueAsyncOperation: AsyncOperation | null = null
      let queueWaitBar:
        | ((status: "cancelled" | "fail" | "success", error?: unknown) => void)
        | null = null
      const transitionString = trans.join(":")
      const onFinishId = Array.isArray(onFinish?.id)
        ? onFinish.id.join(":")
        : onFinish?.id

      // Shared cleanup list for onFinish resolvers keyed by onFinishId
      // All operations with the same onFinishId share the same cleanup list
      const onFinishCleanUpRegistry =
        (store.internal.onFinishCleanUpRegistry ??= {}) as Record<
          string,
          ((error: unknown) => void)[]
        >
      const onFinishCleanUpList = onFinishId
        ? (onFinishCleanUpRegistry[onFinishId] ??= [])
        : undefined

      const runActualPromise = async (): Promise<void> => {
        // End the queue wait subtransition when starting to run
        if (queueAsyncOperation) {
          store.transitions.doneKey(
            trans,
            queueAsyncOperation,
            { onFinishTransition: noop, skipDoneEvent: true },
            "queue-start"
          )
          store.transitions.doneSubtransition(`$queue:${queueId}`)
          queueWaitBar?.("success")
        }

        const promiseAsyncOperation = newAsyncOperation({
          fn: undefined,
          fnUser: promiseFn,
          when: Date.now(),
          type: "promise",
          label: label ?? undefined,
        })

        store.transitions.addKey(trans, promiseAsyncOperation, "queue-promise")

        const cleanUpList = (store.transitions.cleanUpList[transitionString] ??=
          new Set())

        const finishBar = newBar(
          transitionString,
          labelWhen(new Date()),
          label ?? null
        )

        const racePromise = PromiseWithResolvers<T>()

        const cleanUp = (error: unknown) => {
          cleanUpList.delete(cleanUp)
          const aborted = isAbortError(error)
          finishBar(aborted ? "cancelled" : "fail", error)
          store.transitions.doneKey(
            trans,
            promiseAsyncOperation,
            { onFinishTransition: noop, skipDoneEvent: !aborted },
            `queue-promise/${aborted ? "cancel" : "on-error"}`
          )
          if (aborted) {
            racePromise.reject({ code: 20 })
          }
        }
        cleanUpList.add(cleanUp)

        const runOnFinishCallback = createRunOnFinishCallback({
          store,
          newBar,
          transition: trans,
          wrapPromise,
        })

        try {
          if (onFinishId) {
            const finishCleanUpList =
              store.transitions.finishCallbacks.cleanUps[onFinishId]
            finishCleanUpList?.forEach(cleanUp => (cleanUp as any)(trans))
          }

          // Only call addFinish for immediate (non-enqueued) items
          // Enqueued items already called addFinish in onEnqueued
          if (onFinishId && !queueAsyncOperation) {
            store.transitions.addFinish(onFinishId)
          }
          await Promise.race<T>([
            promiseFn({ signal: signal! }),
            racePromise.promise,
          ])

          finishBar("success")
          cleanUpList.delete(cleanUp)

          if (onFinishId) store.transitions.doneFinish(onFinishId)

          // Resolve all hanging onFinish resolvers BEFORE adding new ones
          // This handles the case where earlier operations' dispatchAsync hung
          // (because beforeDispatch returned undefined when isLast was false)
          if (onFinishCleanUpList) {
            onFinishCleanUpList.forEach(fn => fn(null))
            onFinishCleanUpList.length = 0
          }

          if (onFinish) {
            runOnFinishCallback({
              onFinish,
              error: undefined,
              cleanUpList,
            })
          }

          store.transitions.doneKey(
            trans,
            promiseAsyncOperation,
            { onFinishTransition: runSuccessCallback },
            "queue-promise/on-success"
          )
        } catch (error) {
          if (onFinishId) {
            store.transitions.doneFinish(onFinishId)
            // Reject pending resolvers so that previous operations' onFinish can complete
            // This handles the case where op1 succeeded but its dispatchAsync is pending
            // because isLast() was false, and op2 fails
            store.transitions.rejectPendingResolvers(onFinishId, error)
          }

          // Resolve all hanging onFinish resolvers BEFORE adding new ones
          if (onFinishCleanUpList) {
            onFinishCleanUpList.forEach(fn => fn(null))
            onFinishCleanUpList.length = 0
          }

          // NOTE: Do NOT call runOnFinishCallback here!
          // onFinish should only run when the promise succeeds, not when it fails.
          // See store.onfinish-skip-on-error.test.ts for expected behavior.

          const aborted = isAbortError(error)
          if (aborted) {
            onAbort?.()
            throw error
          }
          store.transitions.emitError(trans, error)
          throw error
        }
      }

      const fn = () => {
        queueManager.enqueue(queueId, runActualPromise, trans, {
          onEnqueued: () => {
            // Only add queue wait async operation and subtransition when actually enqueued
            queueAsyncOperation = newAsyncOperation({
              fn: undefined,
              fnUser: promiseFn,
              when,
              type: "queue",
              label: `$queue:${queueId}`,
            })
            store.transitions.addKey(trans, queueAsyncOperation, "queue-wait")
            store.transitions.addSubtransition(`$queue:${queueId}`)
            queueWaitBar = newBar(
              transitionString,
              labelWhen(new Date()),
              `$queue:${queueId}`,
              "queue"
            )
            // Register finish early so isLast() works correctly across queued items
            if (onFinishId) store.transitions.addFinish(onFinishId)
          },
          onError: (error: unknown) => {
            if (queueAsyncOperation) {
              store.transitions.doneKey(
                trans,
                queueAsyncOperation,
                { onFinishTransition: noop, skipDoneEvent: true },
                "queue-error"
              )
              store.transitions.doneSubtransition(`$queue:${queueId}`)
              queueWaitBar?.("fail", error)
            }

            // Clean up hanging onFinish callbacks when queue aborts
            if (onFinishId) {
              store.transitions.doneFinish(onFinishId)
            }

            // Reject all pending onFinish resolvers
            if (onFinishCleanUpList) {
              onFinishCleanUpList.forEach(cleanUp => cleanUp(error))
              onFinishCleanUpList.length = 0
            }

            store.transitions.emitError(trans, error)
          },
          onStart: () => {},
          onComplete: () => {},
        })
      }

      const asyncOperation = newAsyncOperation({
        fn,
        fnUser: promiseFn,
        when,
        type: "promise",
        label: label ?? undefined,
      })

      onAsyncOperation!(asyncOperation)
    }

    return {
      onFinish,
      promise,
      setTimeout,
      setName,
      queue,
    }
  }
}

const createRunOnFinishCallback = ({
  store,
  newBar,
  transition,
  wrapPromise,
}: {
  store: SomeStoreGeneric
  newBar: (
    transitionString: string,
    when: string,
    label: string | null,
    kind?: "queue" | "onFinish" | "user"
  ) => (status: "cancelled" | "fail" | "success", error?: unknown) => void
  transition: Transition
  wrapPromise: (
    promiseFn: (props: AsyncPromiseProps) => Promise<any>,
    config?: AsyncPromiseConfig,
    onFinish?: AsyncPromiseOnFinishProps,
    emitBar?: boolean
  ) => void
}) => {
  const transitionString = transition.join(":")
  const runOnFinishCallback = ({
    onFinish,
    error,
    cleanUpList,
  }: {
    onFinish: AsyncPromiseOnFinishProps
    error: unknown
    cleanUpList: Set<(error: unknown) => void>
  }) => {
    const onFinishId = Array.isArray(onFinish.id)
      ? onFinish.id.join(":")
      : onFinish.id
    const onFinishFn = onFinish.fn
    const getFinishesCount = () => store.transitions.state.finishes[onFinishId]
    const resolver = PromiseWithResolvers<void>()
    const barLabel = `$onFinish-${onFinishId}`
    const finishOnFinishBar = onFinishId
      ? newBar(transitionString, labelWhen(new Date()), barLabel, "onFinish")
      : () => {}

    const unregisterResolver = store.transitions.registerPendingResolver(
      onFinishId,
      { reject: resolver.reject }
    )
    resolver.promise.catch(() => {}).finally(() => unregisterResolver())

    const finishCleanUp = onFinishFn(
      () => resolver.resolve(),
      (error: unknown) => resolver.reject(error),
      {
        error,
        getResultList: () => [],
        isLast: () => (getFinishesCount() ?? 0) === 0,
      }
    )
    store.transitions.finishCallbacks.cleanUps[onFinishId] ??= new Set()
    store.transitions.finishCallbacks.cleanUps[onFinishId].add(
      // @ts-expect-error - TODO: fix this
      function listener(incomingTransition: Transition) {
        const prevContext = store.internal.context
        store.internal.context = {
          type: StoreInternalContextEnum.ON_FINISH_CLEAN_UP,
        }
        // @ts-expect-error - TODO: fix this
        finishCleanUp?.(incomingTransition)
        store.internal.context = prevContext
        // @ts-expect-error - TODO: fix this
        cleanUpList.delete(listener)
      }
    )
    wrapPromise(
      async ctx => {
        if (ctx.signal.aborted) return
        ctx.signal.addEventListener("abort", () => {
          resolver.reject()
        })
        await resolver.promise
          .then(() => {
            finishOnFinishBar("success")
          })
          .catch(() => {
            finishOnFinishBar("fail")
          })
      },
      {
        label: barLabel,
      },
      undefined,
      false
    )
  }

  return runOnFinishCallback
}
