import {
  DoneKeyOptions,
  OnFinishTransition,
  Transition,
  TransitionNullable,
} from "./types"
import { EventEmitter } from "./event-emitter"
import { Subject } from "./Subject"
import { setImmutable } from "./fn/common"
import { $$onDebugMode } from "./helpers/log"

export type TransitionsStoreState = Record<string, number>

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
  #prefix = "00)"
  controllers: {
    get: (
      transition: TransitionNullable | string,
      controller?: AbortController | null | undefined
    ) => AbortController | undefined
    set: (
      transition: TransitionNullable | string,
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
    get: (transition: TransitionNullable) => Record<string, any>
    values: Record<string, any>
  }

  callbacks = {
    done: new Map<string, (() => void) | null>(),
    error: new Map<string, ((error: unknown) => void) | null>(),
  }
  cleanUpList: Record<string, Set<(error: unknown | null) => void>> = {}

  #shouldLog = true

  constructor(shouldLog?: boolean) {
    super()
    if (shouldLog !== undefined) {
      this.#shouldLog = shouldLog
    }
    this.state = {}

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

  private getMeta(transition: TransitionNullable) {
    if (!transition) return {} // TODO
    const key = transition.join(":")
    this.meta.values[key] ??= {}
    return this.meta.values[key]
  }

  eraseKey(
    transition: TransitionNullable,
    options: DoneKeyOptions,
    from?: string
  ) {
    if (!transition) return
    const key = transition.join(":")
    const subTransitions = this.state[key]
    for (let i = 0; i < subTransitions; i++) {
      this.doneKey(transition, options, from)
    }
  }

  cleanup(transitionName: string | null) {
    if (!transitionName) return
    this.callbacks.done.set(transitionName, null)
    this.callbacks.error.set(transitionName, null)
  }

  emitError(transition: Transition, error: unknown) {
    const transitionName = transition.join(":")
    const errorCallback = this.callbacks.error.get(transitionName)
    errorCallback?.(error)

    this.callbacks.done.set(transitionName, null)
    this.callbacks.error.set(transitionName, null)
  }

  setController(
    transition: TransitionNullable | string,
    value: AbortController
  ) {
    if (!transition) return
    const key =
      typeof transition === "string" ? transition : transition.join(":")
    // this.controllers.values[key] = value
    this.controllers = setImmutable(this.controllers, `values.${key}`, value)
  }

  ensureController(transition: TransitionNullable | string) {
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
      $$onDebugMode(() =>
        console.log(`${this.#prefix} transitions`, this.state)
      )
    this.notify()
  }

  get(transition: Transition) {
    const key = transition.join(":")
    return this.state[key] ?? 0
  }

  add(
    state: TransitionsStoreState,
    transitionName: string
  ): TransitionsStoreState {
    state[transitionName] ??= 0
    state[transitionName]++
    return state
  }

  addKey(transition: Transition, from?: string) {
    const state = { ...this.state }

    let meta = ""
    const newState = transition.reduce((acc, key) => {
      key = String(key)
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.add(acc, key)
    }, state)

    this.setState(newState)

    if (this.#shouldLog) {
      const key = transition?.join(":")
      const sub = this.state[key] ?? 0
      $$onDebugMode(() =>
        console.log(
          `%c ${this.#prefix} k add: ${key} ${from} [${sub}]`,
          "color: steelblue"
        )
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
    transitionName: string,
    options: DoneKeyOptions,
    functionsToRun: Record<string, VoidFunction[]>
  ): TransitionsStoreState {
    if (!transitionName) return state
    state[transitionName] ??= 0
    state[transitionName]--
    if (state[transitionName] === -1) debugger

    if (state[transitionName] <= 0) {
      if (transitionName !== null) {
        functionsToRun[transitionName] ??= []
        functionsToRun[transitionName].push(() => {
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
    const state = { ...this.state }
    state[transitionName] = 0

    this.setState(state)
  }

  doneKey(
    transition: TransitionNullable,
    options: DoneKeyOptions,
    from?: string
  ) {
    if (!transition) return

    const state = { ...this.state }
    const functionsToRun: Record<string, VoidFunction[]> = {}
    let meta = ""
    const newState = transition.reduce((acc, key) => {
      key = String(key)
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, options, functionsToRun)
    }, state)

    this.setState(newState)
    if (this.#shouldLog) {
      const key = transition?.join(":")
      const sub = this.state[key] ?? 0
      $$onDebugMode(() =>
        console.log(
          `%c ${this.#prefix} k done: ${key} ${from} [${sub}]`,
          "color: turquoise"
        )
      )
    }
    Object.values(functionsToRun)
      .flat()
      .forEach(fn => fn())
  }

  isHappeningUnique(transition: TransitionNullable) {
    if (!transition) return false
    const key = transition.join(":")
    return this.state[key] > 0
  }

  isHappening(transition: TransitionNullable) {
    if (!transition) return false
    let isHappening = false

    let meta = ""
    for (let key of transition) {
      key = String(key)
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      const subtransitions = this.state[key]
      if (subtransitions > 0) {
        isHappening = true
        break
      }
    }

    return isHappening
  }
}
