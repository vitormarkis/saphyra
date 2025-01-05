import { Async, BaseState, GenericStore, TransitionsExtension } from "./types"

const _noTransitionError = new Error("No transition provided.")

export function createAsync<TState extends BaseState = BaseState>(
  store: GenericStore<TState, any> & TransitionsExtension,
  state: TState,
  transition: any[] | null | undefined
): Async<TState> {
  const promise = <T>(
    promise: Promise<T>,
    onSuccess: (value: T, state: TState) => Partial<TState> | void
  ) => {
    if (!transition) throw _noTransitionError
    store.transitions.addKey(transition)
    promise
      .then(value => {
        store.registerSet(
          state => {
            const newState = onSuccess(value, state) ?? {}
            return { ...state, ...newState }
          },
          state,
          transition,
          "reducer"
        )
        store.transitions.doneKey(transition, null)
      })
      .catch(error => {
        console.log("%cSomething went wrong! Rolling back the store state. [TODO]", "color: palevioletred")
        store.transitions.doneKey(transition, error)
      })
  }

  const timer = (callback: () => void) => {
    if (!transition) throw _noTransitionError
    store.transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback()
        store.transitions.doneKey(transition, null)
      } catch (error) {
        console.log("%cSomething went wrong! Rolling back the store state. [TODO]", "color: palevioletred")
        store.transitions.doneKey(transition, error)
      }
    }, 0)
  }

  return {
    promise,
    timer,
  }
}
