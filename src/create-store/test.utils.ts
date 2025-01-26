import { newStoreDef } from "~/create-store"
import { BaseState, SomeStoreGeneric } from "~/create-store/types"
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
            actor.set(s => ({
              count: s.count + 1,
            }))
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

export function getStoreTransitionInfoSource(store: SomeStoreGeneric) {
  const controllers = store.transitions.controllers.values
  const setters = store.settersRegistry
  const doneCallbackList = store.transitions.callbacks.done
  const errorCallbackList = store.transitions.callbacks.error
  const transitions = store.transitions.state.transitions
  const state = store.getState()

  return {
    controllers,
    setters,
    doneCallbackList,
    errorCallbackList,
    transitions,
    state,
  }
}
