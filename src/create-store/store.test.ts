import { BeforeDispatch, SomeStoreGeneric } from "~/create-store/types"
import { newStoreDef } from "./index"
import { describe, expect, vi } from "vitest"
import { sleep } from "~/sleep"

let newStore: (...args: any[]) => SomeStoreGeneric
let store: SomeStoreGeneric

// const log = console.log
// console.log = () => {}

const cancelPrevious: BeforeDispatch = ({ action, transition, transitionStore }) => {
  if (transitionStore.isHappeningUnique(transition)) {
    const controller = transitionStore.controllers.get(transition)
    controller.abort()
  }

  return action
}

beforeEach(() => {
  newStore = newStoreDef({
    reducer({ state, action, set, async }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }

      if (action.type === "increment-async") {
        async
          .promise(ctx => sleep(1000, undefined, ctx.signal))
          .onSuccess((_, actor) => {
            actor.set(s => ({ count: s.count + 1 }))
          })
      }

      return state
    },
  })
  store = newStore({
    count: 0,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

test("simple dispatch interaction", () => {
  const spy_add = vi.spyOn(store.transitions, "addKey")
  const spy_done = vi.spyOn(store.transitions, "doneKey")

  store.dispatch({ type: "increment" })
  const state = store.getState()
  expect(state).toEqual({ count: 1 })

  // don't interact with the transition
  expect(spy_add).toHaveBeenCalledTimes(0)
  expect(spy_done).toHaveBeenCalledTimes(0)
})

test("simple dispatch interaction with transition", () => {
  const spy_add = vi.spyOn(store.transitions, "addKey")
  const spy_done = vi.spyOn(store.transitions, "doneKey")

  store.dispatch({
    type: "increment",
    transition: ["increment"],
    beforeDispatch: cancelPrevious,
  })
  const state = store.getState()
  expect(state).toEqual({ count: 1 })

  expect(spy_add).toHaveBeenCalledTimes(1)
  expect(spy_done).toHaveBeenCalledTimes(1)
})

test("ensure effects are settled after sync transition", () => {
  store.dispatch({
    type: "increment",
    transition: ["increment"],
    beforeDispatch: cancelPrevious,
  })

  const transitionName = "increment"

  const controller = store.transitions.controllers.values[transitionName]
  expect(controller.signal.aborted).toBe(false)

  const setters = store.settersRegistry[transitionName]
  expect(setters).toHaveLength(0)

  const doneCallback = store.transitions.callbacks.done.get(transitionName)
  const errorCallback = store.transitions.callbacks.error.get(transitionName)
  expect(doneCallback).toBeNull()
  expect(errorCallback).toBeNull()

  const transitions = store.transitions.state.transitions
  expect(transitions).toMatchObject({})
})

describe("ensure effects are settled after async transition", () => {
  const transitionName = "increment"

  beforeEach(() => {
    vi.useFakeTimers()
    store.dispatch({
      type: "increment-async",
      transition: ["increment"],
      beforeDispatch: cancelPrevious,
    })
  })

  test("before dispatch", () => {
    const controller = store.transitions.controllers.values[transitionName]
    expect(controller.signal.aborted).toBe(false)

    const setters = store.settersRegistry[transitionName]
    expect(setters).toBeUndefined()

    const doneCallback = store.transitions.callbacks.done.get(transitionName)
    expect(doneCallback).toBeInstanceOf(Function)
    const errorCallback = store.transitions.callbacks.error.get(transitionName)
    expect(errorCallback).toBeInstanceOf(Function)

    const transitions = store.transitions.state.transitions
    expect(transitions).toStrictEqual({ [transitionName]: 1 })

    const state = store.getState()
    expect(state).toEqual({ count: 0 })
  })

  test("after promise resolve", async () => {
    await vi.advanceTimersByTimeAsync(1000)

    const controller = store.transitions.controllers.values[transitionName]
    expect(controller.signal.aborted).toBe(false)

    const setters = store.settersRegistry[transitionName]
    expect(setters).toStrictEqual([])

    const doneCallback = store.transitions.callbacks.done.get(transitionName)
    expect(doneCallback).toBeNull()
    const errorCallback = store.transitions.callbacks.error.get(transitionName)
    expect(errorCallback).toBeNull()

    const transitions = store.transitions.state.transitions
    expect(transitions).toStrictEqual({})

    const state = store.getState()
    expect(state).toEqual({ count: 1 })
  })

  describe("abort", () => {
    beforeEach(async () => {
      const controller = store.transitions.controllers.values[transitionName]
      const spy_abort = vi.spyOn(controller, "abort")

      await vi.advanceTimersByTimeAsync(500)
      store.dispatch({
        type: "increment-async",
        transition: ["increment"],
        beforeDispatch: cancelPrevious,
      })

      expect(spy_abort).toHaveBeenCalledTimes(1)
    })

    test("before wait", () => {
      const controller = store.transitions.controllers.values[transitionName]
      expect(controller.signal.aborted).toBe(false)

      const setters = store.settersRegistry[transitionName]
      expect(setters).toStrictEqual([])

      const doneCallback = store.transitions.callbacks.done.get(transitionName)
      expect(doneCallback).toBeInstanceOf(Function)
      const errorCallback = store.transitions.callbacks.error.get(transitionName)
      expect(errorCallback).toBeInstanceOf(Function)

      const transitions = store.transitions.state.transitions
      expect(transitions).toStrictEqual({ [transitionName]: 1 })

      const state = store.getState()
      expect(state).toEqual({ count: 0 })
    })

    test("after promise resolve", async () => {
      await vi.advanceTimersByTimeAsync(1000)
      const controller = store.transitions.controllers.values[transitionName]
      expect(controller.signal.aborted).toBe(false)

      const setters = store.settersRegistry[transitionName]
      expect(setters).toStrictEqual([])

      const doneCallback = store.transitions.callbacks.done.get(transitionName)
      expect(doneCallback).toBeNull()
      const errorCallback = store.transitions.callbacks.error.get(transitionName)
      expect(errorCallback).toBeNull()

      const transitions = store.transitions.state.transitions
      expect(transitions).toStrictEqual({})

      const state = store.getState()
      expect(state).toEqual({ count: 1 })
    })
  })
})
