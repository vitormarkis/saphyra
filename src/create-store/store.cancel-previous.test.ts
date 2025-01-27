import { describe, expect, MockInstance, vi } from "vitest"
import { getStoreTransitionInfo, newStore } from "~/create-store/test.utils"
import { BeforeDispatch, SomeStoreGeneric } from "~/create-store/types"

let store: SomeStoreGeneric
let spy_completeTransition: MockInstance<any>

const cancelPrevious: BeforeDispatch = ({
  action,
  transition,
  transitionStore,
}) => {
  if (transitionStore.isHappeningUnique(transition)) {
    const controller = transitionStore.controllers.get(transition)
    controller.abort()
  }

  return action
}

beforeEach(() => {
  store = newStore({
    count: 0,
    currentTransition: null,
  })
  spy_completeTransition = vi.spyOn(store, "completeTransition")
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

    test("after run dispatch", () => {
      const info = getStoreTransitionInfo(store, transitionName)

      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toBeUndefined()
      expect(info.doneCallback).toBeInstanceOf(Function)
      expect(info.errorCallback).toBeInstanceOf(Function)
      expect(info.transitions).toStrictEqual({
        [transitionName]: 1,
      })
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
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
      expect(info.state).toEqual(expect.objectContaining({ count: 1 }))

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
        expect(info.setters).toBeUndefined()
        expect(info.doneCallback).toBeInstanceOf(Function)
        expect(info.errorCallback).toBeInstanceOf(Function)
        expect(info.transitions).toStrictEqual({
          [transitionName]: 1,
        })
        expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
      })

      test("after promise resolve", async () => {
        await vi.advanceTimersByTimeAsync(500)
        const info_before = getStoreTransitionInfo(store, transitionName)
        expect(info_before.controller.signal.aborted).toBe(false)
        expect(info_before.setters).toBeUndefined()
        expect(info_before.doneCallback).toBeInstanceOf(Function)
        expect(info_before.errorCallback).toBeInstanceOf(Function)
        expect(info_before.transitions).toStrictEqual({
          [transitionName]: 1,
        })
        expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(0)

        // await vi.advanceTimersByTimeAsync(1000 -> 500) // TODO
        await vi.advanceTimersByTimeAsync(500)
        const info = getStoreTransitionInfo(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions).toStrictEqual({})
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)
      })
    })

    describe("abort twice", () => {
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
        const info_after = getStoreTransitionInfo(store, transitionName)
        expect(info_after.controller.signal.aborted).toBe(false)

        const info_2 = getStoreTransitionInfo(store, transitionName)
        const spy_abort_2 = vi.spyOn(info_2.controller, "abort")

        expect(spy_abort_2).not.toBe(spy_abort)

        // SECOND ABORT
        store.dispatch({
          type: "increment-async",
          transition: ["increment"],
          beforeDispatch: cancelPrevious,
        })

        expect(spy_abort_2).toHaveBeenCalledTimes(1)
        // abort, and make a new abort controller for the transition
        const info_3 = getStoreTransitionInfo(store, transitionName)
        expect(info_3.controller.signal.aborted).toBe(false)
      })

      test("before wait", () => {
        const info = getStoreTransitionInfo(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toBeUndefined()
        expect(info.doneCallback).toBeInstanceOf(Function)
        expect(info.errorCallback).toBeInstanceOf(Function)
        expect(info.transitions).toStrictEqual({
          [transitionName]: 1,
        })
        expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).not.toHaveBeenCalledTimes(1)
      })

      test("after promise resolve", async () => {
        await vi.advanceTimersByTimeAsync(500)
        const info_before = getStoreTransitionInfo(store, transitionName)
        expect(info_before.controller.signal.aborted).toBe(false)
        expect(info_before.setters).toBeUndefined()
        expect(info_before.doneCallback).toBeInstanceOf(Function)
        expect(info_before.errorCallback).toBeInstanceOf(Function)
        expect(info_before.transitions).toStrictEqual({
          [transitionName]: 1,
        })
        expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(0)

        await vi.advanceTimersByTimeAsync(500)
        const info = getStoreTransitionInfo(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions).toStrictEqual({})
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)
      })
    })
  })
})
