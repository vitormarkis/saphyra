import { DoneKeyOptions, OnFinishTransition } from "./types"
import { EventEmitter } from "./event-emitter"
import { Subject } from "./Subject"
import { setImmutable } from "./fn/common"
import { logDebug } from "./helpers/log"
import { createAncestor } from "./utils"

export type TransitionsStoreState = {
  transitions: Record<string, number>
  subtransitions: Record<string, number>
  finishes: Record<string, number>
}

export const runSuccessCallback: OnFinishTransition = ({
  transitionName,
  transitionStore,
}) => {
  const doneCallback = transitionStore.callbacks.done.get(transitionName)

  if (!doneCallback) {
    return
  }

  transitionStore.allEvents.emit("transition-done-successfully", transitionName)
  doneCallback?.()
  transitionStore.callbacks.done.set(transitionName, null)
  transitionStore.callbacks.error.set(transitionName, null)
}

export class TransitionsStore extends Subject {
  #prefix = "00)"
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
  allEvents = new EventEmitter<{
    "start-transition": [transitionName: string]
    "transition-aborted": [transitionName: string]
    "transition-done": [transitionName: string]
    "subtransition-done": [id: string]
    "finish-done": [id: string]
    "transition-done-successfully": [transitionName: string]
  }>()
  meta: {
    get: (transition: any[] | null | undefined) => Record<string, any>
    values: Record<string, any>
  }

  callbacks = {
    done: new Map<string, (() => void) | null>(),
    error: new Map<string, ((error: unknown) => void) | null>(),
  }

  finishCallbacks = {
    success: new Map<string, (() => void) | null>(),
    cleanUps: {} as Record<string, Set<() => void>>,
    error: new Map<string, ((error: unknown) => void) | null>(),
  }

  cleanUpList: Record<string, Set<(error: unknown | null) => void>> = {}

  #shouldLog = true

  constructor(shouldLog?: boolean) {
    super()
    if (shouldLog !== undefined) {
      this.#shouldLog = shouldLog
    }
    this.state = {
      transitions: {},
      subtransitions: {},
      finishes: {},
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

  eraseKey(
    transition: any[] | null | undefined,
    options: DoneKeyOptions,
    from?: string
  ) {
    if (!transition) return
    const key = transition.join(":")
    const subTransitions = this.state.transitions[key]
    for (let i = 0; i < subTransitions; i++) {
      this.doneKey(transition, options, from)
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
    if (this.#shouldLog)
      logDebug(`${this.#prefix} transitions`, this.state.transitions)
    this.notify()
  }

  get(transition: any[]) {
    const key = transition.join(":")
    return this.state.transitions[key] ?? 0
  }

  add(state: TransitionsStoreState, transitionName: string | null) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]++
    if (state.transitions[transitionName] === 1) {
      this.allEvents.emit("start-transition", transitionName)
    }
    return state
  }

  addKey(transition: any[] | null | undefined, from?: string) {
    if (!transition) return

    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    const ancestors = createAncestor<string>(transition)
    const newState = ancestors.reduce(
      (acc: TransitionsStoreState, ancestor: string[]) => {
        const key = ancestor.join(":")
        const result = this.add(acc, key)
        return result ?? acc
      },
      state
    )

    this.setState(newState)

    if (this.#shouldLog) {
      const key = transition?.join(":")
      const sub = this.state.transitions[key] ?? 0
      logDebug(
        `%c ${this.#prefix} k add: ${key} ${from} [${sub}]`,
        "color: steelblue"
      )
    }

    return () =>
      this.doneKey(
        transition,
        {
          onFinishTransition: runSuccessCallback,
        },
        "add-key-cleanup"
      )
  }

  done(
    state: TransitionsStoreState,
    transitionName: string | null,
    options: DoneKeyOptions,
    functionsToRun: Record<string, Function[]>
  ) {
    if (!transitionName) return
    state.transitions[transitionName] ??= 0
    state.transitions[transitionName]--
    if (state.transitions[transitionName] === -1) debugger

    if (state.transitions[transitionName] <= 0) {
      if (transitionName !== null) {
        functionsToRun[transitionName] ??= []
        functionsToRun[transitionName].push(() => {
          this.allEvents.emit("transition-done", transitionName)
          this.events.done.emit(transitionName)
          options.onFinishTransition({
            transitionName,
            transitionStore: this,
          })
        })
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
    options: DoneKeyOptions,
    from?: string
  ) {
    if (!transition) return

    const state = {
      ...this.state,
      transitions: { ...this.state.transitions },
    }

    const functionsToRun: Record<string, Function[]> = {}
    let meta = ""
    const newState = transition.reduce((acc, key) => {
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, options, functionsToRun)
    }, state)

    this.setState(newState)
    if (this.#shouldLog) {
      const key = transition?.join(":")!
      const sub = this.state.transitions[key] ?? 0
      logDebug(
        `%c ${this.#prefix} k done: ${key} ${from} [${sub}]`,
        "color: turquoise"
      )
    }
    Object.values(functionsToRun)
      .flat()
      .forEach(fn => fn())
  }

  setFinishes(finishes: Record<string, number>) {
    this.state.finishes = finishes
    this.notify()
  }

  addFinish(id: string) {
    const finishes = { ...this.state.finishes }
    finishes[id] ??= 0
    finishes[id]++
    this.setFinishes(finishes)
  }

  doneFinish(id: string) {
    if (!(id in this.state.finishes)) {
      throw new Error(`Finish ${id} not found`)
    }
    const finishes = { ...this.state.finishes }
    finishes[id]--
    this.setFinishes(finishes)
    if (finishes[id] === 0) {
      this.allEvents.emit("finish-done", id)
    }
  }

  setSubtransitions(subtransitions: Record<string, number>) {
    this.state.subtransitions = subtransitions
    this.notify()
  }

  addSubtransition(id: string) {
    const subtransitions = { ...this.state.subtransitions }
    subtransitions[id] ??= 0
    subtransitions[id]++
    this.setSubtransitions(subtransitions)
  }

  doneSubtransition(id: string) {
    if (!(id in this.state.subtransitions)) {
      throw new Error(`Subtransition ${id} not found`)
    }
    const subtransitions = { ...this.state.subtransitions }
    subtransitions[id]--
    this.setSubtransitions(subtransitions)
    if (subtransitions[id] === 0) {
      this.allEvents.emit("subtransition-done", id)
    }
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
