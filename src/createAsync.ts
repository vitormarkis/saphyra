import { TransitionsStore } from "./TransitionsStore"

export function createAsync(
  transitions: TransitionsStore,
  transition: any[] | null,
  rollbackState: (error: unknown) => void
) {
  const promise = <T>(promise: Promise<T>, onSuccess: (value: T) => void) => {
    transitions.addKey(transition)
    promise
      .then(value => {
        onSuccess(value)
        transitions.doneKey(transition, null)
      })
      .catch(error => {
        console.log(
          "%cSomething went wrong! Rolling back the store state.",
          "color: palevioletred"
        )
        rollbackState(error)
        transitions.doneKey(transition, error)
      })
  }

  const timer = (callback: () => void) => {
    transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback()
        transitions.doneKey(transition, null)
      } catch (error) {
        console.log(
          "%cSomething went wrong! Rolling back the store state.",
          "color: palevioletred"
        )
        rollbackState(error)
        transitions.doneKey(transition, error)
      }
    }, 0)
  }

  return {
    promise,
    timer,
  }
}
