import { Subject } from "./Subject"

export type TransitionsStoreState = {
  transitions: Record<string, number>
}

export class TransitionsStore extends Subject {
  state: TransitionsStoreState

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

  done(transitionName: string | null) {
    if (!transitionName) return
    const state = { ...this.state, transitions: { ...this.state.transitions } }
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    this.setState(state)
  }

  doneKey(transition: any[] | null) {
    if (!transition) return
    let ctx = ""
    for (let key of transition) {
      if (ctx !== "") key = `${ctx}:${key}`
      ctx = key
      this.done(key)
    }
  }
}
