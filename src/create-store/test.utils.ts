import { newStoreDef } from "~/create-store"
import { BaseState, SomeStore, SomeStoreGeneric } from "~/create-store/types"
import { sleep } from "~/sleep"

type CounterState = BaseState & {
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

export type TestCounterStore = SomeStore<CounterState, CounterActions, {}>

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

export function getStoreTransitionInfo(
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
    setters,
    doneCallback,
    errorCallback,
    transitions,
    state,
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
