import { TransitionsStore } from "./transitions-store"
import { Async } from "./types"

const _noTransitionError = new Error("No transition provided.")

export function createAsync<TState>(
  transitions: TransitionsStore,
  state: TState,
  transition: any[] | null | undefined,
  registerSet: (
    setter: (state: TState) => Partial<TState>,
    state: TState,
    transition: any[] | null | undefined
  ) => void
): Async<TState> {
  const promise = <T>(
    promise: Promise<T>,
    onSuccess: (value: T, state: TState) => Partial<TState> | void
  ) => {
    if (!transition) throw _noTransitionError
    transitions.addKey(transition)
    promise
      .then(value => {
        registerSet(
          s => {
            const newState = onSuccess(value, s) ?? {}
            return { ...s, ...newState }
          },
          state,
          transition
        )
        transitions.doneKey(transition, null)
      })
      .catch(error => {
        console.log("%cSomething went wrong! Rolling back the store state. [TODO]", "color: palevioletred")
        transitions.doneKey(transition, error)
      })
  }

  const timer = (callback: () => void) => {
    if (!transition) throw _noTransitionError
    transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback()
        transitions.doneKey(transition, null)
      } catch (error) {
        console.log("%cSomething went wrong! Rolling back the store state. [TODO]", "color: palevioletred")
        transitions.doneKey(transition, error)
      }
    }, 0)
  }

  return {
    promise,
    timer,
  }
}
