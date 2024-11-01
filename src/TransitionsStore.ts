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

  add(transitionName: string | null) {
    if (!transitionName) return
    const state = { ...this.state, transitions: { ...this.state.transitions } }
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]++
    this.setState(state)
  }

  done(transitionName: string | null) {
    if (!transitionName) return
    const state = { ...this.state, transitions: { ...this.state.transitions } }
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    this.setState(state)
  }
}
