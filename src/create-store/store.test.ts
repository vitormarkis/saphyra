import { BeforeDispatch, SomeStoreGeneric } from "~/create-store/types"
import { newStoreDef } from "./index"
import { describe, expect, MockInstance, vi } from "vitest"
import { sleep } from "~/sleep"

let newStore: (...args: any[]) => SomeStoreGeneric
let store: SomeStoreGeneric
let spy_completeTransition: MockInstance<any>

function getStoreTransitionInfo(store: SomeStoreGeneric, transitionName: string) {
  const controller = store.transitions.controllers.values[transitionName]
  const setters = store.settersRegistry[transitionName]
  const doneCallback = store.transitions.callbacks.done.get(transitionName)
  const errorCallback = store.transitions.callbacks.error.get(transitionName)
  const transitions = store.transitions.state.transitions
  const state = store.getState()

  return { controller, setters, doneCallback, errorCallback, transitions, state }
}

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
  spy_completeTransition = vi.spyOn(store, "completeTransition")
})

afterEach(() => {
  vi.useRealTimers()
})

const transitionName = "increment"

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

  const info = getStoreTransitionInfo(store, transitionName)
  expect(info.controller.signal.aborted).toBe(false)
  expect(info.setters).toHaveLength(0)
  expect(info.doneCallback).toBeNull()
  expect(info.errorCallback).toBeNull()
  expect(info.transitions).toMatchObject({})
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
    const info = getStoreTransitionInfo(store, transitionName)

    expect(info.controller.signal.aborted).toBe(false)
    expect(info.setters).toBeUndefined()
    expect(info.doneCallback).toBeInstanceOf(Function)
    expect(info.errorCallback).toBeInstanceOf(Function)
    expect(info.transitions).toStrictEqual({ [transitionName]: 1 })
    expect(info.state).toEqual({ count: 0 })
    expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
  })

  test("after promise resolve", async () => {
    await vi.advanceTimersByTimeAsync(1000)
    const info = getStoreTransitionInfo(store, transitionName)

    expect(info.controller.signal.aborted).toBe(false)
    expect(info.setters).toStrictEqual([])
    expect(info.doneCallback).toBeNull()
    expect(info.errorCallback).toBeNull()
    expect(info.transitions).toStrictEqual({})
    expect(info.state).toEqual({ count: 1 })

    expect(spy_completeTransition).toHaveBeenCalledTimes(1)
  })

  describe("abort", () => {
    beforeEach(async () => {
      const info = getStoreTransitionInfo(store, transitionName)
      const spy_abort = vi.spyOn(info.controller, "abort")

      await vi.advanceTimersByTimeAsync(500)
      store.dispatch({
        type: "increment-async",
        transition: ["increment"],
        beforeDispatch: cancelPrevious,
      })

      expect(spy_abort).toHaveBeenCalledTimes(1)
      // abort, and make a new abort controller for the transition
      const info_2 = getStoreTransitionInfo(store, transitionName)
      expect(info_2.controller.signal.aborted).toBe(false)
    })

    test("before wait", () => {
      const info = getStoreTransitionInfo(store, transitionName)
      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toStrictEqual([])
      expect(info.doneCallback).toBeInstanceOf(Function)
      expect(info.errorCallback).toBeInstanceOf(Function)
      expect(info.transitions).toStrictEqual({ [transitionName]: 1 })
      expect(info.state).toEqual({ count: 0 })
      expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
    })

    test("after promise resolve", async () => {
      // await vi.advanceTimersByTimeAsync(500) // TODO
      // await vi.advanceTimersByTimeAsync(1000 -> 500) // TODO
      await vi.advanceTimersByTimeAsync(1000)
      const info = getStoreTransitionInfo(store, transitionName)
      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toStrictEqual([])
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions).toStrictEqual({})
      expect(info.state).toEqual({ count: 1 })
      expect(spy_completeTransition).toHaveBeenCalledTimes(1)
    })
  })
})
