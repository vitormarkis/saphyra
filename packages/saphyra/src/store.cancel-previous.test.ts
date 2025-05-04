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
import { BeforeDispatch } from "./types"

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
      beforeDispatch({ action }) {
        if (action.type === "increment") {
        }
      },
    })

    const info = getStoreTransitionInfoShallowCopy(store, transitionName)
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
      const info = getStoreTransitionInfoShallowCopy(store, transitionName)

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
      const info = getStoreTransitionInfoShallowCopy(store, transitionName)

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
        expect(info.setters).toBeUndefined()
        expect(info.doneCallback).toBeInstanceOf(Function)
        expect(info.errorCallback).toBeInstanceOf(Function)
        expect(info.transitions).toStrictEqual({
          [transitionName]: 1,
        })
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
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions).toStrictEqual({})
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)

        expect(spy_emitError).not.toHaveBeenCalled()
      })
    })

    describe("abort twice", () => {
      beforeEach(async () => {
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
        const info_after = getStoreTransitionInfoShallowCopy(
          store,
          transitionName
        )
        expect(info_after.controller.signal.aborted).toBe(false)

        const info_2 = getStoreTransitionInfoShallowCopy(store, transitionName)
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
        const info_3 = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info_3.controller.signal.aborted).toBe(false)
        expect(spy_emitError).not.toHaveBeenCalled()
      })

      test("before wait", () => {
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toBeUndefined()
        expect(info.doneCallback).toBeInstanceOf(Function)
        expect(info.errorCallback).toBeInstanceOf(Function)
        expect(info.transitions).toStrictEqual({
          [transitionName]: 1,
        })
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
        expect(info_before.setters).toBeUndefined()
        expect(info_before.doneCallback).toBeInstanceOf(Function)
        expect(info_before.errorCallback).toBeInstanceOf(Function)
        expect(info_before.transitions).toStrictEqual({
          [transitionName]: 1,
        })
        expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(0)

        await vi.advanceTimersByTimeAsync(500)
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller.signal.aborted).toBe(false)
        expect(info.setters).toStrictEqual([])
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions).toStrictEqual({})
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)

        expect(spy_emitError).not.toHaveBeenCalled()
      })
    })
  })
})
