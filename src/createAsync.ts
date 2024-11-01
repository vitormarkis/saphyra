import { TransitionsStore } from "./TransitionsStore"

export function createAsync(
  transitions: TransitionsStore,
  transitionName: string | null
) {
  const promise = <T>(promise: Promise<T>, onSuccess: (value: T) => void) => {
    transitions.add(transitionName)
    promise.then(value => {
      onSuccess(value)
      transitions.done(transitionName)
    })
  }

  const timer = (callback: () => void) => {
    transitions.add(transitionName)
    setTimeout(() => {
      callback()
      transitions.done(transitionName)
    }, 0)
  }

  return {
    promise,
    timer,
  }
}
