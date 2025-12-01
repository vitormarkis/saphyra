import {
  AsyncOperation,
  DoneKeyOptions,
  OnFinishTransition,
  Transition,
  TransitionNullable,
} from "./types"
import { EventEmitter } from "./event-emitter"
import { Subject } from "./Subject"
import { setImmutable } from "./fn/common"
import { $$onDebugMode } from "./helpers/log"
import { createAncestor } from "./utils"
import { deleteImmutably } from "./helpers/delete-immutably"

export type TransitionsStoreState = {
  transitions: Record<string, AsyncOperation[]>
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
  transitionStore.callbacks.done.delete(transitionName)
  transitionStore.callbacks.error.delete(transitionName)
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
    getKeys: () => string[]
    clear: (transition: string) => void
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
    get: (transition: TransitionNullable) => Record<string, any>
    set: (transition: TransitionNullable, meta: Record<string, any>) => void
    clear: () => void
    values: Record<string, any>
    delete: (transition: string) => void
  }

  callbacks = {
    done: new Map<string, (() => void) | null>(),
    error: new Map<string, ((error: unknown) => void) | null>(),
  }

  finishCallbacks = {
    success: new Map<string, (() => void) | null>(),
    cleanUps: {} as Record<string, Set<() => void>>,
    error: new Map<string, ((error: unknown) => void) | null>(),
    pendingResolvers: {} as Record<
      string,
      Set<{ reject: (error: unknown) => void }>
    >,
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
      set: this.setMeta.bind(this),
      clear: () => {
        this.meta.values = {}
      },
      values: {},
      delete: (transition: string) => {
        this.meta.values = deleteImmutably(this.meta.values, transition)
      },
    }

    this.controllers = {
      get: this.ensureController.bind(this),
      set: this.setController.bind(this),
      values: {},
      getKeys: () => Object.keys(this.controllers.values),
      clear: (transition: string) => {
        this.controllers.values = deleteImmutably(
          this.controllers.values,
          transition
        )
      },
    }
  }

  private setMeta(transition: TransitionNullable, meta: Record<string, any>) {
    if (!transition) return
    const key = transition.join(":")
    this.meta.values[key] = meta
  }

  private getMeta(transition: TransitionNullable) {
    if (!transition) return {} // TODO
    const key = transition.join(":")
    this.meta.values[key] ??= {}
    return this.meta.values[key]
  }

  cleanup(transitionName: string | null) {
    if (!transitionName) return
    this.callbacks.done.delete(transitionName)
    this.callbacks.error.delete(transitionName)
  }

  emitError(transition: Transition, error: unknown) {
    const transitionName = transition.join(":")

    this.events.error.emit(transitionName, error)

    const errorCallback = this.callbacks.error.get(transitionName)
    errorCallback?.(error)

    this.callbacks.done.delete(transitionName)
    this.callbacks.error.delete(transitionName)
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
      this.controllers.values = setImmutable(
        this.controllers.values,
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

  get(transition: Transition): AsyncOperation[] {
    const key = transition.join(":")
    return this.state.transitions[key] ?? []
  }

  add(
    state: TransitionsStoreState,
    transitionName: string,
    asyncOperation: AsyncOperation
  ): TransitionsStoreState {
    const existingOperations = state.transitions[transitionName] ?? []
    state.transitions[transitionName] = [...existingOperations, asyncOperation]
    if (state.transitions[transitionName].length === 1) {
      this.allEvents.emit("start-transition", transitionName)
    }
    return state
  }

  addKey(
    transition: Transition,
    asyncOperation: AsyncOperation,
    from?: string
  ) {
    const state = { ...this.state, transitions: { ...this.state.transitions } }

    const ancestors = createAncestor<string>(transition)
    const newState = ancestors.reduce(
      (acc: TransitionsStoreState, ancestor: string[]) => {
        const key = ancestor.join(":")
        const result = this.add(acc, key, asyncOperation)
        return result ?? acc
      },
      state
    )

    this.setState(newState)

    if (this.#shouldLog) {
      const key = transition?.join(":")
      const sub = this.state.transitions[key] ?? []
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
        asyncOperation,
        {
          onFinishTransition: runSuccessCallback,
        },
        "add-key-cleanup"
      )
  }

  done(
    state: TransitionsStoreState,
    transitionName: string,
    asyncOperation: AsyncOperation,
    options: DoneKeyOptions,
    functionsToRun: Record<string, VoidFunction[]>
  ): TransitionsStoreState {
    if (!transitionName) return state
    if (!state.transitions[transitionName]) return state
    const oldLength = state.transitions[transitionName].length
    const filteredOperations = state.transitions[transitionName].filter(
      ao => ao !== asyncOperation
    )
    const newLength = filteredOperations.length
    if (oldLength === newLength) debugger

    if (filteredOperations.length <= 0) {
      if (transitionName !== null) {
        state.transitions = deleteImmutably(state.transitions, transitionName)
        functionsToRun[transitionName] ??= []
        functionsToRun[transitionName].push(() => {
          this.allEvents.emit("transition-done", transitionName)
          if (!options.skipDoneEvent) {
            this.events.done.emit(transitionName)
          }
          options.onFinishTransition({
            transitionName,
            transitionStore: this,
          })
          // this.meta.delete(transitionName)
        })
      }
    } else {
      state.transitions[transitionName] = filteredOperations
    }

    return state
  }

  clear(transitionName: string | null) {
    if (!transitionName) return
    const state = { ...this.state }
    state.transitions[transitionName] = []

    this.setState(state)
  }

  doneKey(
    transition: TransitionNullable,
    asyncOperation: AsyncOperation,
    options: DoneKeyOptions,
    from?: string
  ) {
    if (!transition) return

    const state = { ...this.state, transitions: { ...this.state.transitions } }
    const functionsToRun: Record<string, VoidFunction[]> = {}
    let meta = ""
    const newState = transition.reduce((acc, key) => {
      key = String(key)
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      return this.done(acc, key, asyncOperation, options, functionsToRun)
    }, state)

    this.setState(newState)
    if (this.#shouldLog) {
      const key = transition?.join(":")
      const sub = this.state.transitions[key] ?? []
      $$onDebugMode(() =>
        console.log(
          `%c ${this.#prefix} k done: ${key} ${from} [${sub.length}]`,
          "color: turquoise"
        )
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
      // Already cleaned up, ignore
      return
    }
    const finishes = { ...this.state.finishes }
    finishes[id]--
    if (finishes[id] <= 0) {
      // Clean up completely when reaching 0
      delete finishes[id]
      this.setFinishes(finishes)
      this.allEvents.emit("finish-done", id)
    } else {
      this.setFinishes(finishes)
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

  isHappeningUnique(transition: TransitionNullable) {
    if (!transition) return false
    const key = transition.join(":")
    return (this.state.transitions[key]?.length ?? 0) > 0
  }

  isHappening(transition: TransitionNullable) {
    if (!transition) return false
    let isHappening = false

    let meta = ""
    for (let key of transition) {
      key = String(key)
      if (meta !== "") key = `${meta}:${key}`
      meta = key
      const subtransitions = this.get(transition)
      if (subtransitions.length > 0) {
        isHappening = true
        break
      }
    }

    return isHappening
  }

  registerPendingResolver(
    onFinishId: string,
    resolver: { reject: (error: unknown) => void }
  ) {
    this.finishCallbacks.pendingResolvers[onFinishId] ??= new Set()
    this.finishCallbacks.pendingResolvers[onFinishId].add(resolver)
    return () => {
      this.finishCallbacks.pendingResolvers[onFinishId]?.delete(resolver)
    }
  }

  rejectPendingResolvers(onFinishId: string, error: unknown) {
    const resolvers = this.finishCallbacks.pendingResolvers[onFinishId]
    if (!resolvers) return
    resolvers.forEach(resolver => resolver.reject(error))
    resolvers.clear()
  }
}
