export type AnyFunction = (...args: any[]) => any

export type SubjectType<T extends AnyFunction = AnyFunction> = {
  observers: Set<T>
  notify: () => void
  subscribe: (cb: T) => () => void
}

export function createSubject<
  T extends AnyFunction = AnyFunction,
>(): SubjectType<T> {
  let isScheduled = false
  const observers = new Set<T>()

  function notify() {
    if (isScheduled) return

    isScheduled = true
    setTimeout(function notifyFn() {
      isScheduled = false
      observers.forEach(cb => cb())
    })
  }

  function subscribe(cb: T) {
    observers.add(cb)
    return () => observers.delete(cb)
  }

  return {
    observers,
    notify,
    subscribe,
  }
}
