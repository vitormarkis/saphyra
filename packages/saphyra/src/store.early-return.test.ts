import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  test,
  vi,
} from "vitest"
import { GENERAL_TRANSITION } from "./const"
import {
  captureCallbackHistory,
  captureValueHistory,
  getStoreTransitionInfoShallowCopy,
  getStoreTransitionInfoSourceShallowCopy,
  newStore,
  prepareInfo,
  TestCounterStore,
} from "./test.utils"
import { BeforeDispatch } from "./types"
import { noop } from "./fn/noop"

let store: TestCounterStore
let spy_completeTransition: MockInstance

const earlyReturn: BeforeDispatch = () => {
  // always skip actoin
  return
}

beforeEach(() => {
  store = newStore({
    count: 0,
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
      expect(info.controllers).toStrictEqual({})
    })

    test("no transition", () => {
      store.dispatch({
        type: "increment",
        beforeDispatch: earlyReturn,
      })

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.controllers).toStrictEqual({})
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

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.controllers).toStrictEqual({})
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
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
        beforeDispatch: earlyReturn,
      })

      settersHistory = getSettersHistory().toReversed()
      expect(settersHistory).toStrictEqual([])

      /**
       * Two
       */
      getSettersHistory = captureValueHistory(store, "settersRegistry")

      store.dispatch({
        type: "increment",
        transition: ["increment", "two"],
        beforeDispatch: earlyReturn,
      })
      settersHistory = getSettersHistory().toReversed()
      expect(settersHistory).toStrictEqual([])

      /**
       * Three
       */
      getSettersHistory = captureValueHistory(store, "settersRegistry")

      store.dispatch({
        type: "increment",
        transition: ["increment", "three"],
        beforeDispatch: earlyReturn,
      })

      settersHistory = getSettersHistory().toReversed()
      expect(settersHistory).toStrictEqual([])

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))
      expect(info.controllers).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
      expect(spy_completeTransition).toHaveBeenCalledTimes(0)
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
      for (let i = 0; i < TIMES; i++) {
        store.dispatch({
          type: "increment-async",
          transition: ["increment"],
          beforeDispatch: earlyReturn,
        })
      }

      await vi.advanceTimersByTimeAsync(1000)

      const settersHistory = getSettersHistory()
      expect(settersHistory).toHaveLength(0)

      const info = prepareInfo(getStoreTransitionInfoSourceShallowCopy(store))

      expect(info.controllers).toStrictEqual({})
      expect(info.setters).toStrictEqual({})
      expect(info.doneCallbackList).toStrictEqual(new Map())
      expect(info.errorCallbackList).toStrictEqual(new Map())
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 0 }))
    })
  })
})
