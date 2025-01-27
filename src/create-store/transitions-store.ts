import { TransitionsStoreEvents } from "~/create-store/event-emitter-transitions"
import { Subject } from "../Subject"
import { CleanUpTransitionConfig } from "~/create-store/types"

export type TransitionsStoreState = {
  transitions: Record<string, number>
}

type EventsType = {
  [K: string]: [error: unknown | null]
}

export class TransitionsStore extends Subject {
  controllers: {
    get: (transition: any[] | null | undefined | string) => AbortController
    values: Record<string, AbortController>
  }
  state: TransitionsStoreState
  events = {
    done: new TransitionsStoreEvents(),
    error: new TransitionsStoreEvents(),
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
      get: this.getController.bind(this),
      values: {},
    }
  }

  private getMeta(transition: any[] | null | undefined) {
    if (!transition) return {} // TODO
    const key = transition.join(":")
    this.meta.values[key] ??= {}
    return this.meta.values[key]
  }

  eraseKey(
    transition: any[] | null | undefined,
    config: CleanUpTransitionConfig = "with-effects"
  ) {
    if (!transition) return
    const key = transition.join(":")
    const subTransitions = this.state.transitions[key]
    for (let i = 0; i < subTransitions; i++) {
      this.doneKey(transition, config)
    }
  }

  cleanup(transitionName: string | null) {
    if (!transitionName) return
    this.callbacks.done.set(transitionName, null)
    this.callbacks.error.set(transitionName, null)
  }

  // checkShouldHandleError(transition: any[], error: unknown) {
  //   if (!isNewActionError(error)) return true
  //   const transitionName = transition.join(":")
  //   this.meta.values[transitionName]["$$_skipErrorTokens"] ??= []
  //   const skipErrorToken =
  //     this.meta.values[transitionName]["$$_skipErrorTokens"].pop()
  //   const shouldSkipErrorHandling = skipErrorToken != null
  //   const shouldRunErrorCallback = !shouldSkipErrorHandling

  //   return shouldRunErrorCallback
  // }

  emitError(transition: any[], error: unknown) {
    //   error,
    //   meta: this.getMeta(transition),
    // })
    // const shouldRunErrorCallback = this.checkShouldHandleError(
    //   transition,
    //   error
    // )
    // if (!shouldRunErrorCallback) return
    const transitionName = transition.join(":")
    const errorCallback = this.callbacks.error.get(transitionName)
    errorCallback?.(error)
    this.cleanup(transitionName)
  }

  getController(transition: any[] | null | undefined | string) {
    if (!transition) return new AbortController() // TODO
    const key =
      typeof transition === "string" ? transition : transition.join(":")
    this.controllers.values[key] ??= new AbortController()
    return this.controllers.values[key]
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

    return () => this.doneKey(transition, "with-effects")
  }

  done(
    state: TransitionsStoreState,
    transitionName: string | null,
    config: CleanUpTransitionConfig
  ) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--

    if (state.transitions[transitionName] <= 0) {
      delete state.transitions[transitionName]
      if (config !== "skip-effects") {
        const doneCallback = this.callbacks.done.get(transitionName)
        doneCallback?.()
        this.cleanup(transitionName)
      }
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

  doneKey(
    transition: any[] | null | undefined,
    config: CleanUpTransitionConfig
  ) {
    if (!transition) return

    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    let meta = ""
    const newState = transition.reduce((acc, key) => {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, config)
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
