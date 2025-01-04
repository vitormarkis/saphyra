import { EventEmitterXX } from "./event-emitter"
import { Subject } from "./Subject"

export type TransitionsStoreState = {
  transitions: Record<string, number>
}

type EventsDone = {
  [K: string]: [error: unknown | null]
}

export class TransitionsStore extends Subject {
  state: TransitionsStoreState
  events = {
    done: new EventEmitterXX<EventsDone>(),
  }

  constructor() {
    super()
    this.state = {
      transitions: {},
    }
  }

  private setState(newState: TransitionsStoreState) {
    this.state = newState
    this.notify()
  }

  get(transition: any[]) {
    const key = transition.join(":")
    return this.state.transitions[key]
  }

  add(transitionName: string | null) {
    if (!transitionName) return
    const state = { ...this.state, transitions: { ...this.state.transitions } }
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]++
    this.setState(state)
  }

  addKey(transition: any[] | null) {
    if (!transition) return
    let ctx = ""
    for (let key of transition) {
      if (ctx !== "") key = `${ctx}:${key}`
      ctx = key
      this.add(key)
    }
  }

  done(transitionName: string | null, error: unknown | null) {
    if (!transitionName) return
    const state = { ...this.state, transitions: { ...this.state.transitions } }
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    if (state.transitions[transitionName] <= 0) {
      delete state.transitions[transitionName]
      this.events.done.emit(transitionName, error)
    }

    this.setState(state)
  }

  doneKey(transition: any[] | null, error: unknown | null) {
    if (!transition) return
    let ctx = ""
    for (let key of transition) {
      if (ctx !== "") key = `${ctx}:${key}`
      ctx = key
      this.done(key, error)
    }
  }

  isHappening(transition: any[] | null) {
    if (!transition) return false
    let isHappening = false

    let ctx = ""
    for (let key of transition) {
      if (ctx !== "") key = `${ctx}:${key}`
      ctx = key
      const subtransitions = this.state.transitions[key]
      if (subtransitions > 0) {
        isHappening = true
        break
      }
    }

    return isHappening
  }
}
