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
import {
  captureValueHistory,
  getStoreTransitionInfoShallowCopy,
  getStoreTransitionInfoSourceShallowCopy,
  newStore,
} from "./test.utils"
import { SomeStoreGeneric } from "./types"

let store: SomeStoreGeneric
let spy_completeTransition: MockInstance

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
  describe("DIFFERENT TRANSITIONS", () => {
    test("ensure effects are settled after sync action", () => {
      store.dispatch({
        type: "increment",
        transition: ["increment"],
      })

      const info = getStoreTransitionInfoShallowCopy(store, transitionName)
      expect(info.controller.signal.aborted).toBe(false)
      expect(info.setters).toHaveLength(0)
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions).toMatchObject({})
      expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
    })

    it("should increment 3 times", () => {
      store.dispatch({
        type: "increment",
        transition: ["increment"],
      })
      store.dispatch({
        type: "increment",
        transition: ["increment"],
      })
      store.dispatch({
        type: "increment",
        transition: ["increment"],
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
        })
      }

      await vi.advanceTimersByTimeAsync(1000)

      const settersHistory = getSettersHistory()
      expect(settersHistory).toHaveLength(3 + 1) // + 1 for done cleanup

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
