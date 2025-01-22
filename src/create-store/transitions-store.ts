import { Subject } from "../Subject"
import { EventEmitter } from "./event-emitter"

export type TransitionsStoreState = {
  transitions: Record<string, number>
}

type EventsType = {
  [K: string]: [error: unknown | null]
}

export class TransitionsStore extends Subject {
  controllers: Record<string, AbortController> = {}
  state: TransitionsStoreState
  events = {
    done: new EventEmitter<EventsType>(),
    error: new EventEmitter<EventsType>(),
  }
  meta: {
    get: (transition: any[] | null) => Record<string, any>
    values: Record<string, any>
  }

  constructor() {
    super()
    this.state = {
      transitions: {},
    }

    this.meta = {
      get: this.getMeta.bind(this),
      values: {},
    }
  }

  private getMeta(transition: any[] | null) {
    if (!transition) return {} // TODO
    const key = transition.join(":")
    this.meta.values[key] ??= {}
    return this.meta.values[key]
  }

  private setState(newState: TransitionsStoreState) {
    this.state = newState
    this.notify()
  }

  get(transition: any[]) {
    const key = transition.join(":")
    return this.state.transitions[key]
  }

  add(state: TransitionsStoreState, transitionName: string | null) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]++
    return state
  }

  addKey(transition: any[] | null) {
    if (!transition) return

    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    let meta = ""
    const newState = transition.reduce((acc, key) => {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.add(acc, key)
    }, state)

    this.setState(newState)
  }

  done(state: TransitionsStoreState, transitionName: string | null, error: unknown | null) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    if (state.transitions[transitionName] <= 0) {
      delete state.transitions[transitionName]
      this.events.done.emit(transitionName, error)
      this.cleanup(transitionName)
    }

    return state
  }

  cleanup(transitionName: string | null) {
    // if (transitionName) {
    //   this.meta.values[transitionName] = {}
    // }
  }

  clear(transitionName: string | null) {
    if (!transitionName) return
    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }
    state.transitions[transitionName] = 0

    this.setState(state)
  }

  doneKey(transition: any[] | null, error: unknown | null) {
    if (!transition) return

    // let clearKeys = false

    // if (isNewActionError(error)) {
    if (error) {
      // clearKeys = true
      this.events.error.emit(transition.join(":"), error)
    }

    let state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    let meta = ""
    const newState = transition.reduce((acc, key) => {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, error)
    }, state)

    this.setState(newState)
  }

  isHappening(transition: any[] | null) {
    if (!transition) return false
    let isHappening = false

    let meta = ""
    for (let key of transition) {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      const subtransitions = this.state.transitions[key]
      if (subtransitions > 0) {
        isHappening = true
        break
      }
    }

    return isHappening
  }
}
