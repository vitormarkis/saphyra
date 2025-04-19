import { DoneKeyOptions, OnFinishTransition } from "./types"
import { EventEmitter } from "./event-emitter"
import { Subject } from "./Subject"
import { setImmutable } from "./fn/common"

export type TransitionsStoreState = {
  transitions: Record<string, number>
}

export const runSuccessCallback: OnFinishTransition = ({
  transitionName,
  transitionStore,
}) => {
  const doneCallback = transitionStore.callbacks.done.get(transitionName)
  doneCallback?.()
  transitionStore.callbacks.done.set(transitionName, null)
  transitionStore.callbacks.error.set(transitionName, null)
}

export class TransitionsStore extends Subject {
  controllers: {
    get: (
      transition: any[] | null | undefined | string,
      controller?: AbortController | null | undefined
    ) => AbortController | undefined
    set: (
      transition: any[] | null | undefined | string,
      value: AbortController
    ) => void
    values: Record<string, AbortController>
  }
  state: TransitionsStoreState
  events = {
    done: new EventEmitter(),
    error: new EventEmitter(),
  }
  meta: {
    get: (transition: any[] | null | undefined) => Record<string, any>
    values: Record<string, any>
  }

  callbacks = {
    done: new Map<string, (() => void) | null>(),
    error: new Map<string, ((error: unknown) => void) | null>(),
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

    this.controllers = {
      get: this.ensureController.bind(this),
      set: this.setController.bind(this),
      values: {},
    }
  }

  private getMeta(transition: any[] | null | undefined) {
    if (!transition) return {} // TODO
    const key = transition.join(":")
    this.meta.values[key] ??= {}
    return this.meta.values[key]
  }

  eraseKey(transition: any[] | null | undefined, options: DoneKeyOptions) {
    if (!transition) return
    const key = transition.join(":")
    const subTransitions = this.state.transitions[key]
    for (let i = 0; i < subTransitions; i++) {
      this.doneKey(transition, options)
    }
  }

  cleanup(transitionName: string | null) {
    if (!transitionName) return
    this.callbacks.done.set(transitionName, null)
    this.callbacks.error.set(transitionName, null)
  }

  emitError(transition: any[], error: unknown) {
    const transitionName = transition.join(":")
    const errorCallback = this.callbacks.error.get(transitionName)
    errorCallback?.(error)

    this.callbacks.done.set(transitionName, null)
    this.callbacks.error.set(transitionName, null)
  }

  setController(
    transition: any[] | null | undefined | string,
    value: AbortController
  ) {
    if (!transition) return
    const key =
      typeof transition === "string" ? transition : transition.join(":")
    // this.controllers.values[key] = value
    this.controllers = setImmutable(this.controllers, `values.${key}`, value)
  }

  ensureController(transition: any[] | null | undefined | string) {
    if (!transition) return
    const transitionName =
      typeof transition === "string" ? transition : transition.join(":")
    if (!this.controllers.values[transitionName]) {
      this.controllers = setImmutable(
        this.controllers,
        transitionName,
        new AbortController()
      )
    }
    return this.controllers.values[transitionName]
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

  addKey(transition: any[] | null | undefined) {
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

    return () =>
      this.doneKey(transition, {
        onFinishTransition: runSuccessCallback,
      })
  }

  done(
    state: TransitionsStoreState,
    transitionName: string | null,
    options: DoneKeyOptions
  ) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    if (state.transitions[transitionName] <= 0) {
      delete state.transitions[transitionName]
      this.events.done.emit(transitionName)
      options.onFinishTransition({
        transitionName,
        transitionStore: this,
      })
    }

    return state
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

  doneKey(transition: any[] | null | undefined, options: DoneKeyOptions) {
    if (!transition) return

    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    let meta = ""
    const newState = transition.reduce((acc, key) => {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, options)
    }, state)

    this.setState(newState)
  }

  isHappeningUnique(transition: any[] | null | undefined) {
    if (!transition) return false
    const key = transition.join(":")
    return this.state.transitions[key] > 0
  }

  isHappening(transition: any[] | null | undefined) {
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
