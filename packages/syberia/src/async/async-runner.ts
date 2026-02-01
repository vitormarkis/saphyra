import { TransitionsStore, type Transition, type AsyncWorkItem } from "../transitions"
import { randomString } from "../utils/random-string"

export type AsyncContext = {
  signal: AbortSignal
  current?: any
}

export class AsyncRunner {
  private transitionsStore: TransitionsStore

  constructor(transitionsStore: TransitionsStore) {
    this.transitionsStore = transitionsStore
  }

  run<T>(
    transition: Transition,
    signal: AbortSignal,
    asyncFn: (ctx: AsyncContext) => Promise<T>
  ): Promise<T> {
    const item: AsyncWorkItem = {
      id: randomString(8),
      when: Date.now(),
    }

    this.transitionsStore.add(transition, item)

    return asyncFn({ signal }).finally(() => {
      this.transitionsStore.done(transition, item.id)
    })
  }

  isAborted(signal: AbortSignal): boolean {
    return signal.aborted
  }
}
