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
  newStoreDefTest,
  TestCounterStore,
} from "./test.utils"
import { noop } from "./fn/noop"

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
    expect(store.transitions.cleanUpList[transitionString]).toBeUndefined()
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

      expect(info.controller).toBeUndefined()
      expect(info.setters).toBeUndefined()
      expect(info.doneCallback).toBeNull()
      expect(info.errorCallback).toBeNull()
      expect(info.transitions[transitionName]).toBeUndefined()
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
        expect(info.setters).toBeUndefined()
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
        expect(info_before.setters).toBeUndefined()
        expect(info_before.doneCallback).toBeInstanceOf(Function)
        expect(info_before.errorCallback).toBeInstanceOf(Function)
        expect(info_before.transitions[transitionName].length).toBe(1)
        expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(0)

        // await vi.advanceTimersByTimeAsync(1000 -> 500) // TODO
        await vi.advanceTimersByTimeAsync(500)
        const info = getStoreTransitionInfoShallowCopy(store, transitionName)
        expect(info.controller).toBeUndefined()
        expect(info.setters).toBeUndefined()
        expect(info.doneCallback).toBeNull()
        expect(info.errorCallback).toBeNull()
        expect(info.transitions[transitionName]).toBeUndefined()
        expect(info.state).toEqual(expect.objectContaining({ count: 1 }))
        expect(spy_completeTransition).toHaveBeenCalledTimes(1)

        expect(spy_emitError).not.toHaveBeenCalled()
      })
    })
  })
})

describe("ensure cancel previous works when passed as default", () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
      defaults: {
        beforeDispatch: cancelPrevious,
      },
    },
    reducer({ state, action, set, async, dispatchAsync }) {
      if (action.type === "increment-async") {
        async().promise(async () => {
          await new Promise(res => setTimeout(res))
          set(s => ({ count: s.count + 1 }))
        })
      }

      if (action.type === "increment-nested-async") {
        const random = () => Math.random().toString(36).substring(2, 6)
        async()
          .setName("first-increment")
          .promise(async () => {
            await dispatchAsync({
              type: "increment-async",
              transition: [...(action.transition ?? []), random()],
            })
          })
        async()
          .setName("second-increment")
          .promise(async () => {
            await dispatchAsync({
              type: "increment-async",
              transition: [...(action.transition ?? []), random()],
            })
          })
      }
      return state
    },
  })

  test("dispatch + async action", async () => {
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment-async",
      transition: ["counter"],
    })
    store.dispatch({
      type: "increment-async",
      transition: ["counter"],
    })
    await store.waitFor(["counter"])
    expect(store.getState()).toEqual({ count: 1 })
  })

  test("dispatchAsync + async action", async () => {
    const store = newStore({ count: 0 })
    store.dispatchAsync({
      type: "increment-async",
      transition: ["counter"],
    })
    store.dispatchAsync({
      type: "increment-async",
      transition: ["counter"],
    })
    await new Promise(res => setTimeout(res))
    expect(store.getState()).toEqual({ count: 1 })
  })

  test("dispatch + nested async actions", async () => {
    const store = newStore({ count: 0 })
    Object.assign(globalThis, { __store: store })
    store.dispatch({
      type: "increment-nested-async",
      transition: ["counter"],
    })
    store.dispatch({
      type: "increment-nested-async",
      transition: ["counter"],
    })
    await store.waitFor(["counter"])
    expect(store.getState()).toEqual({ count: 2 })
  })

  test("dispatch + nested async - allow on demand", async () => {
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment-nested-async",
      transition: ["counter"],
      beforeDispatch: ({ action }: any) => action,
    })
    store.dispatch({
      type: "increment-nested-async",
      transition: ["counter"],
      beforeDispatch: ({ action }: any) => action,
    })
    await store.waitFor(["counter"])
    expect(store.getState()).toEqual({ count: 4 })
  })
})
