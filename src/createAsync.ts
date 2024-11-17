import { TransitionsStore } from "./TransitionsStore"

export function createAsync(transitions: TransitionsStore, transition: any[] | null) {
  const promise = <T>(promise: Promise<T>, onSuccess: (value: T) => void) => {
    transitions.addKey(transition)
    promise.then(value => {
      onSuccess(value)
      transitions.doneKey(transition)
    })
  }

  const timer = (callback: () => void) => {
    transitions.addKey(transition)
    setTimeout(() => {
      callback()
      transitions.doneKey(transition)
    }, 0)
  }

  return {
    promise,
    timer,
  }
}
