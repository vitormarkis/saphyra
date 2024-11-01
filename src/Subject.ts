export type AnyFunction = (...args: any[]) => any

export abstract class Subject<T extends AnyFunction = AnyFunction> {
  observers = new Set<T>()

  notify() {
    this.observers.forEach(cb => cb())
  }

  subscribe(cb: T) {
    this.observers.add(cb)
    return () => this.observers.delete(cb)
  }
}
