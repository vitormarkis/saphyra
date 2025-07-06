import {
  afterEach,
  beforeEach,
  describe,
  expect,
  MockInstance,
  test,
  vi,
} from "vitest"
import {
  getStoreTransitionInfoShallowCopy,
  newStore,
  TestCounterStore,
} from "./test.utils"

let store: TestCounterStore
let spy_completeTransition: MockInstance<any>
let spy_emitError: MockInstance<any>

const cancelPrevious = ({ action, transition, abort }: any) => {
  abort(transition)
  return action
}

beforeEach(() => {
  store = newStore({
    count: 0,
  })
  spy_completeTransition = vi.spyOn(store, "completeTransition")
  spy_emitError = vi.spyOn(store.transitions, "emitError")
})

afterEach(() => {
  vi.useRealTimers()
})

const transitionName = "increment"

describe("before dispatch: cancel previous", () => {
  test("ensure effects are settled after sync transition", () => {
    store.dispatch({
      type: "increment",
      transition: ["increment"],
      beforeDispatch: () => {},
    })

    const info = getStoreTransitionInfoShallowCopy(store, transitionName)
    expect(info.controller.signal.aborted).toBe(false)
    expect(info.setters).toBeUndefined()
    expect(info.doneCallback).toBeNull()
    expect(info.errorCallback).toBeNull()
    expect(info.transitions).toMatchObject({})
  })

  test("ensure cleanUpList is cleared after transition is aborted", async () => {
    vi.useFakeTimers()
    store.dispatch({
      type: "increment-async",
      transition: ["increment"],
      beforeDispatch: cancelPrevious,
    })

    const transitionString = "increment"
    expect(store.transitions.cleanUpList[transitionString]).toBeDefined()
    expect(store.transitions.cleanUpList[transitionString].size).toBe(1)

    store.dispatch({
      type: "increment-async",
      transition: ["increment"],
      beforeDispatch: cancelPrevious,
    })

    await vi.advanceTimersByTimeAsync(1000)
    expect(store.transitions.cleanUpList[transitionString]).toStrictEqual(
      new Set()
    )
    vi.useRealTimers()
  })

  describe("ensure effects are settled after async transition", () => {
    const transitionName = "increment"

    beforeEach(() => {
      vi.useFakeTimers()
    })

    test("after run dispatch", () => {
      store.dispatch({
        type: "increment-async",
        transition: ["increment"],
        beforeDispatch: cancelPrevious,
      })
      const info = getStoreTransitionInfoShallowCopy(store, transitionName)

      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toBeUndefined()
      expect(info.doneCallback).toBeInstanceOf(Function)
      expect(info.errorCallback).toBeInstanceOf(Function)
      expect(info.transitions[transitionName].length).toBe(1)
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
      expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
    })

    test("after promise resolve", async () => {
      store.dispatch({
        type: "increment-async",
        transition: ["increment"],
        beforeDispatch: cancelPrevious,
      })
      await vi.advanceTimersByTimeAsync(1000)
      const info = getStoreTransitionInfoShallowCopy(store, transitionName)

      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toStrictEqual([])
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions[transitionName].length).toBe(0)
      expect(info.state).toEqual(expect.objectContaining({ count: 1 }))

      expect(spy_completeTransition).toHaveBeenCalledTimes(1)
    })

    describe("abort", () => {
      beforeEach(async () => {
        store.dispatch({
          type: "increment-async",
          transition: ["increment"],
          beforeDispatch: cancelPrevious,
        })

        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        const spy_abort = vi.spyOn(info.controller, "abort")

        await vi.advanceTimersByTimeAsync(500)
        store.dispatch({
          type: "increment-async",
          transition: ["increment"],
          beforeDispatch: cancelPrevious,
        })

        expect(spy_abort).toHaveBeenCalledTimes(1)
        // abort, and make a new abort controller for the transition
        const info_2 = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info_2.controller.signal.aborted).toBe(false)
      })

      test("before wait", () => {
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeInstanceOf(Function)
        expect(info.errorCallback).toBeInstanceOf(Function)
        expect(info.transitions[transitionName].length).toBe(1)
        expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
        expect(spy_emitError).not.toHaveBeenCalled()
      })

      test("after promise resolve", async () => {
        await vi.advanceTimersByTimeAsync(500)
        const info_before = getStoreTransitionInfoShallowCopy(
          store,
          transitionName
        )
        expect(info_before.controller.signal.aborted).toBe(false)
        expect(info_before.setters).toStrictEqual([])
        expect(info_before.doneCallback).toBeInstanceOf(Function)
        expect(info_before.errorCallback).toBeInstanceOf(Function)
        expect(info_before.transitions[transitionName].length).toBe(1)
        expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(0)

        // await vi.advanceTimersByTimeAsync(1000 -> 500) // TODO
        await vi.advanceTimersByTimeAsync(500)
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions[transitionName].length).toBe(0)
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)

        expect(spy_emitError).not.toHaveBeenCalled()
      })
    })
  })
})
