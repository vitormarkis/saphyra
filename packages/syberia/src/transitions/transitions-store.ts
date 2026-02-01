import { createSubject, type SubjectType } from "../subject"

export type Transition = string[]

export type AsyncWorkItem = {
  id: string
  when: number
}

export class TransitionsStore {
  private state: Record<string, AsyncWorkItem[]> = {}
  private subject: SubjectType<() => void>

  constructor() {
    this.subject = createSubject()
  }

  subscribe(callback: () => void): () => void {
    return this.subject.subscribe(callback)
  }

  private notify() {
    this.subject.notify()
  }

  add(transition: Transition, item: AsyncWorkItem) {
    const key = transition.join(":")
    this.state[key] ??= []
    this.state[key].push(item)
    this.notify()
  }

  done(transition: Transition, itemId: string) {
    const key = transition.join(":")
    if (!this.state[key]) return

    this.state[key] = this.state[key].filter(item => item.id !== itemId)

    if (this.state[key].length === 0) {
      delete this.state[key]
    }

    this.notify()
  }

  isHappening(transition: Transition): boolean {
    const key = transition.join(":")
    return (this.state[key]?.length ?? 0) > 0
  }

  getItems(transition: Transition): AsyncWorkItem[] {
    const key = transition.join(":")
    return this.state[key] ?? []
  }

  clear(transition: Transition) {
    const key = transition.join(":")
    delete this.state[key]
    this.notify()
  }
}
