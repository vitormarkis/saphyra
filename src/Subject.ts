export type AnyFunction = (...args: any[]) => any

export class Subject<T extends AnyFunction = AnyFunction> {
  observers = new Set<T>()

  notify() {
    this.observers.forEach(cb => cb())
  }

  subscribe(cb: T) {
    this.observers.add(cb)
    return () => this.observers.delete(cb)
  }
}

export function createSubject<
  T extends AnyFunction = AnyFunction,
>(): SubjectType<T> {
  const observers = new Set<T>()

  function notify() {
    observers.forEach(cb => cb())
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

export type SubjectType<T extends AnyFunction = AnyFunction> = {
  observers: Set<T>
  notify: () => void
  subscribe: (cb: T) => () => void
}
