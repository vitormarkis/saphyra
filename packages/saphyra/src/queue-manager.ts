import { Transition } from "./types"

type QueuedItem = {
  runFn: () => void
  transition: Transition
  onError: (error: unknown) => void
  onStart: () => void
  onComplete: () => void
}

export class QueueManager {
  private running: Map<string, boolean> = new Map()
  private queues: Map<string, QueuedItem[]> = new Map()

  enqueue(
    queueId: string,
    runFn: () => Promise<void>,
    transition: Transition,
    callbacks: {
      onEnqueued: () => void
      onError: (error: unknown) => void
      onStart: () => void
      onComplete: () => void
    }
  ): void {
    const isRunning = this.running.get(queueId) ?? false

    if (!isRunning) {
      this.running.set(queueId, true)
      callbacks.onStart()
      this.executeWithErrorHandling(
        queueId,
        runFn,
        callbacks.onError,
        callbacks.onComplete
      )
    } else {
      callbacks.onEnqueued()
      const queue = this.queues.get(queueId) ?? []
      queue.push({
        runFn: () =>
          this.executeWithErrorHandling(
            queueId,
            runFn,
            callbacks.onError,
            callbacks.onComplete
          ),
        transition,
        onError: callbacks.onError,
        onStart: callbacks.onStart,
        onComplete: callbacks.onComplete,
      })
      this.queues.set(queueId, queue)
    }
  }

  private async executeWithErrorHandling(
    queueId: string,
    runFn: () => Promise<void>,
    onError: (error: unknown) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      await runFn()
      onComplete()
      this.processNext(queueId)
    } catch (error) {
      onError(error)
      this.failRemainingQueue(queueId, error)
    }
  }

  private processNext(queueId: string): void {
    const queue = this.queues.get(queueId)
    if (!queue || queue.length === 0) {
      this.running.set(queueId, false)
      return
    }

    const next = queue.shift()!
    this.queues.set(queueId, queue)
    next.onStart()
    next.runFn()
  }

  private failRemainingQueue(queueId: string, error: unknown): void {
    const queue = this.queues.get(queueId)
    if (queue) {
      for (const item of queue) {
        item.onError(error)
      }
      this.queues.set(queueId, [])
    }
    this.running.set(queueId, false)
  }

  clear(queueId: string): void {
    this.queues.set(queueId, [])
    this.running.set(queueId, false)
  }

  clearByTransition(transition: Transition): void {
    const transitionKey = transition.join(":")
    for (const [queueId, queue] of this.queues.entries()) {
      const filtered = queue.filter(
        item => item.transition.join(":") !== transitionKey
      )
      if (filtered.length !== queue.length) {
        this.queues.set(queueId, filtered)
      }
    }
  }

  async flush(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const [queueId] of this.queues.entries()) {
      if (this.running.get(queueId)) {
        promises.push(this.waitForQueueToComplete(queueId))
      }
    }
    await Promise.all(promises)
  }

  private waitForQueueToComplete(queueId: string): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        const queue = this.queues.get(queueId)
        const isRunning = this.running.get(queueId)
        if (!isRunning && (!queue || queue.length === 0)) {
          resolve()
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })
  }

  isRunning(queueId: string): boolean {
    return this.running.get(queueId) ?? false
  }

  getQueueLength(queueId: string): number {
    return this.queues.get(queueId)?.length ?? 0
  }
}
