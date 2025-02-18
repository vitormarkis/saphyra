import { newStoreDef } from "~/create-store/store"
import { SomeStore, SomeStoreGeneric } from "~/create-store/types"
import { sleep } from "~/sleep"

type CounterState = {
  count: number
}

type CounterActions =
  | {
      type: "increment"
    }
  | {
      type: "increment-async"
    }
  | {
      type: "increment-async-error"
    }

export type TestCounterStore = SomeStore<CounterState, CounterActions, {}, any>

export const newStore = newStoreDef<CounterState, CounterState, CounterActions>(
  {
    reducer({ state, action, set, async }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }

      if (action.type === "increment-async") {
        async
          .promise(ctx => sleep(1000, undefined, ctx.signal))
          .onSuccess((_, actor) => {
            actor.set(s => ({ count: s.count + 1 }))
          })
      }

      if (action.type === "increment-async-error") {
        async
          .promise(async ctx => {
            await sleep(1000, undefined, ctx.signal)
            throw new Error("Error while incrementing")
          })
          .onSuccess((_, actor) => {
            actor.set(s => ({ count: s.count + 1 }))
          })
      }

      return state
    },
  }
)

export function getStoreTransitionInfoShallowCopy(
  store: SomeStoreGeneric,
  transitionName: string
) {
  const controller = store.transitions.controllers.values[transitionName]
  const setters = store.settersRegistry[transitionName]
  const doneCallback = store.transitions.callbacks.done.get(transitionName)
  const errorCallback = store.transitions.callbacks.error.get(transitionName)
  const transitions = store.transitions.state.transitions
  const state = store.getState()

  return {
    controller,
    setters: setters ? [...setters] : setters,
    doneCallback: typeof doneCallback === "function" ? doneCallback : null,
    errorCallback: typeof errorCallback === "function" ? errorCallback : null,
    transitions: transitions ? { ...transitions } : transitions,
    state: state ? { ...state } : state,
  }
}

export function getStoreTransitionInfoSourceShallowCopy(
  store: SomeStoreGeneric
) {
  const controllers = { ...store.transitions.controllers.values }
  const setters = { ...store.settersRegistry }
  const doneCallbackList = new Map(store.transitions.callbacks.done)
  const errorCallbackList = new Map(store.transitions.callbacks.error)
  const transitions = { ...store.transitions.state.transitions }
  const state = { ...store.getState() }

  return {
    controllers,
    setters,
    doneCallbackList,
    errorCallbackList,
    transitions,
    state,
  }
}

export function deleteBootstrap(
  info: ReturnType<typeof getStoreTransitionInfoSourceShallowCopy>
) {
  delete info.controllers.bootstrap
  delete info.setters.bootstrap
  info.doneCallbackList.delete("bootstrap")
  info.errorCallbackList.delete("bootstrap")
  delete info.transitions.bootstrap

  return info
}

export function handleState({
  state: { currentTransition, ...restState },
  ...info
}: ReturnType<typeof getStoreTransitionInfoSourceShallowCopy>) {
  return {
    ...info,
    state: restState,
  }
}

export function prepareInfo(
  info: ReturnType<typeof getStoreTransitionInfoSourceShallowCopy>
) {
  info = deleteBootstrap(info)
  info = handleState(info)
  return info
}

export function captureValueHistory<
  T extends Record<string, any>,
  TKey extends keyof T,
  TValue extends T[TKey],
>(
  source: T,
  key: TKey,
  initialValue: TValue[] | null = null,
  cb?: (vale: T[TKey]) => void
) {
  const history: TValue[] = initialValue ?? []

  let memory = source[key]

  Object.defineProperty(source, key, {
    get: () => memory,
    set: newValue => {
      memory = newValue
      history.push(newValue)
      cb?.(newValue)
    },
    enumerable: true,
    configurable: true,
  })

  return () => {
    return history
  }
}

export function captureCallbackHistory<
  T extends Record<string, any>,
  TKey extends keyof T,
  TValue extends T[TKey],
>(
  source: T,
  key: TKey,
  initialValue: TValue[] | null = null,
  cb?: (vale: any[]) => void
) {
  const history: any[] = initialValue ?? []

  let oldCallback = source[key]

  Object.assign(source, {
    [key]: (...args: any[]) => {
      oldCallback?.(...args)
      history.push(args)
      cb?.(args)
    },
  })

  return () => {
    return history
  }
}
