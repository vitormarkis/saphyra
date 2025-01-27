import { noop } from "lodash"
import { describe, expect, MockInstance, vi } from "vitest"
import { GENERAL_TRANSITION } from "~/create-store/const"
import {
  captureCallbackHistory,
  captureValueHistory,
  getStoreTransitionInfoShallowCopy,
  getStoreTransitionInfoSourceShallowCopy,
  newStore,
  prepareInfo,
  TestCounterStore,
} from "~/create-store/test.utils"
import { BeforeDispatch } from "~/create-store/types"

let store: TestCounterStore
let spy_completeTransition: MockInstance

const earlyReturn: BeforeDispatch = () => {
  // always skip actoin
  return
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

describe("before dispatch: default", () => {
  describe("should rollback any effects if no action will be dispatched", () => {
    test("transition", () => {
      const xx = captureCallbackHistory(
        store.transitions.controllers,
        "set",
        [],
        v => {
          noop()
        }
      )
      store.dispatch({
        type: "increment",
        transition: ["increment"],
        beforeDispatch: earlyReturn,
      })

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
      expect(info.controllers).toStrictEqual({
        [GENERAL_TRANSITION]: expect.any(AbortController),
      })
    })

    test.only("no transition", () => {
      store.dispatch({
        type: "increment",
        beforeDispatch: earlyReturn,
      })

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.controllers).toStrictEqual({
        [GENERAL_TRANSITION]: expect.any(AbortController),
      })
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
    })

    test("async transition", () => {
      const getHistory = captureCallbackHistory(store, "dispatch", [], v => {
        noop()
      })
      store.dispatch({
        type: "increment-async",
        transition: ["increment"],
        beforeDispatch: earlyReturn,
      })

      const hh = getHistory()

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
      expect(info.controllers).toStrictEqual({})
    })

    it("should increment 3 times", () => {
      store.dispatch({
        type: "increment",
        transition: ["increment"],
        beforeDispatch: earlyReturn,
      })
      store.dispatch({
        type: "increment",
        transition: ["increment"],
        beforeDispatch: earlyReturn,
      })
      store.dispatch({
        type: "increment",
        transition: ["increment"],
        beforeDispatch: earlyReturn,
      })

      const info = getStoreTransitionInfoShallowCopy(store, transitionName)
      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toHaveLength(0)
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 3 }))
    })

    it("DIFFERENT TRANSITIONS", () => {
      /**
       * One
       */
      let getSettersHistory = captureValueHistory(store, "settersRegistry")
      let settersHistory = getSettersHistory()

      store.dispatch({
        type: "increment",
        transition: ["increment", "one"],
      })

      settersHistory = getSettersHistory().toReversed()
      const one_dispatch = settersHistory.pop()
      expect(one_dispatch).toStrictEqual({
        "bootstrap": [],
        "increment:one": [expect.any(Function)], // add setter
      })

      const one_transition_done = settersHistory.pop()
      expect(one_transition_done).toStrictEqual({
        "bootstrap": [],
        "increment:one": [], // commit transition and cleanup
      })

      /**
       * Two
       */
      getSettersHistory = captureValueHistory(store, "settersRegistry")

      store.dispatch({
        type: "increment",
        transition: ["increment", "two"],
      })
      settersHistory = getSettersHistory().toReversed()

      const two_dispatch = settersHistory.pop()
      expect(two_dispatch).toStrictEqual({
        "bootstrap": [],
        "increment:one": [],
        "increment:two": [expect.any(Function)], // add setter
      })

      const two_transition_done = settersHistory.pop()
      expect(two_transition_done).toStrictEqual({
        "bootstrap": [],
        "increment:one": [],
        "increment:two": [], // commit transition and cleanup
      })

      /**
       * Three
       */
      getSettersHistory = captureValueHistory(store, "settersRegistry")

      store.dispatch({
        type: "increment",
        transition: ["increment", "three"],
      })

      settersHistory = getSettersHistory().toReversed()

      const three_dispatch = settersHistory.pop()
      expect(three_dispatch).toStrictEqual({
        "bootstrap": [],
        "increment:one": [],
        "increment:two": [],
        "increment:three": [expect.any(Function)], // add setter
      })

      const three_transition_done = settersHistory.pop()
      expect(three_transition_done).toStrictEqual({
        "bootstrap": [],
        "increment:one": [],
        "increment:two": [],
        "increment:three": [], // commit transition and cleanup
      })

      const info = getStoreTransitionInfoSourceShallowCopy(store)
      expect(Object.keys(info.controllers)).toHaveLength(3 + 1) // + 1 for bootstrap
      info.doneCallbackList.forEach(fn => {
        expect(fn).toBeNull()
      })
      info.errorCallbackList.forEach(fn => {
        expect(fn).toBeNull()
      })
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 3 }))
      expect(spy_completeTransition).toHaveBeenCalledTimes(3)
    })
  })

  describe("async", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test("ensure effects are settled after sync action", async () => {
      const getSettersHistory = captureValueHistory(store, "settersRegistry")

      const TIMES = 3
      const SETS_PER_ACTION = 1
      for (let i = 0; i < TIMES; i++) {
        store.dispatch({
          type: "increment-async",
          transition: ["increment"],
          beforeDispatch: earlyReturn,
        })
      }

      await vi.advanceTimersByTimeAsync(1000)

      const settersHistory = getSettersHistory()
      expect(settersHistory).toHaveLength(3 + 1) // + 1 for done cleanup

      const [_completedTransitionSetters, lastSetters] =
        settersHistory.toReversed()
      const incrementSetters = lastSetters[transitionName]

      expect(incrementSetters).toHaveLength(SETS_PER_ACTION * TIMES)

      const info = getStoreTransitionInfoShallowCopy(store, transitionName)

      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toStrictEqual([])
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 3 }))
    })
  })
})
