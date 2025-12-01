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
  AsyncSetTimeoutProps,
  AsyncTimerConfig,
  DefaultActions,
  SomeStore,
  SomeStoreGeneric,
  StoreInternalContextEnum,
  Transition,
  TransitionNullable,
} from "./types"
import { isNewActionError, labelWhen } from "./utils"

export const errorNoTransition = () =>
  new Error(
    "No transition! Your reducer triggered async operations without a transition. Add one to your action or set a default transition on your store definition."
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
        const runOnFinishCallback = createRunOnFinishCallback({
          store,
          newBar,
          transition,
          wrapPromise,
        })
        try {
          if (!transition) throw errorNoTransition()
          if (onFinishId) {
            const cleanUpList =
              store.transitions.finishCallbacks.cleanUps[onFinishId]

            // @ts-expect-error - TODO: fix this
            cleanUpList?.forEach(cleanUp => cleanUp(transition))
          }

          if (label) store.transitions.addSubtransition(label)
          if (onFinishId) store.transitions.addFinish(onFinishId)
          await Promise.race<T>([promise, racePromise.promise])
          if (label) store.transitions.doneSubtransition(label)
          if (onFinishId) store.transitions.doneFinish(onFinishId)
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
          if (onFinishId) store.transitions.doneFinish(onFinishId)

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

        const aborted = isNewActionError(error)
        if (aborted) {
          onAbort?.()
        }
        finishBar(aborted ? "cancelled" : "fail", error)

        store.transitions.doneKey(
          transition,
          asyncOperation,
          { onFinishTransition: () => {} },
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
    let onFinishObj: undefined | AsyncPromiseOnFinishProps

    const onFinish: AsyncModule["onFinish"] = _onFinishObj => {
      // if (!_name)
      //   throw new Error(
      //     "Name is required when using async().promise.onFinish, call .setName before .promise"
      //   )

      onFinishObj = _onFinishObj

      return {
        promise,
        setTimeout,
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
        onFinishObj,
        true
      )

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
      }
    }

    return {
      onFinish,
      promise,
      setTimeout,
      setName,
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
    label: string | null
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
      ? newBar(transitionString, labelWhen(new Date()), barLabel)
      : () => {}
    const finishCleanUp = onFinishFn(
      () => resolver.resolve(),
      (error: unknown) => resolver.reject(error),
      {
        error,
        getResultList: () => [],
        isLast: () => getFinishesCount() === 0,
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
