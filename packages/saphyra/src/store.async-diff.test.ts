import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sleep } from "./fn/common"
import { newStoreDefTest } from "./test.utils"

describe("async-diff", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should run diff with async when bootstrap transition", async () => {
    const newTestStore = newStoreDefTest({
      reducer({ state, action, diff, async, set }) {
        if (action.type === "set-count") {
          set({ count: action.value })
        }

        if (diff(["count"])) {
          async.promise(async ({ signal }) => {
            await sleep(100, "", signal)
            set({ $data: String(state.count) })
          })
        }

        return state
      },
    })

    const testStore = newTestStore({ count: 0 })
    await vi.advanceTimersByTimeAsync(100)
    await testStore.waitForBootstrap()
    expect(testStore.getState().count).toBe(0)
    expect(testStore.getState().$data).toBe("0")
  })

  it("should run diff with async when dispatching", async () => {
    const newTestStore = newStoreDefTest({
      reducer({ state, action, diff, async, set }) {
        if (action.type === "set-count") {
          set({ count: action.value })
        }

        if (diff(["count"])) {
          async.promise(async ({ signal }) => {
            await sleep(100, "", signal)
            set({ $data: String(state.count) })
          })
        }

        return state
      },
    })

    const testStore = newTestStore({ count: 0 })
    await vi.advanceTimersByTimeAsync(100)
    await testStore.waitForBootstrap()
    expect(testStore.getState().count).toBe(0)
    expect(testStore.getState().$data).toBe("0")
    testStore.dispatch({
      type: "set-count",
      value: 1,
      transition: ["set-count"],
    })
    await vi.advanceTimersByTimeAsync(100)
    expect(testStore.getState().count).toBe(1)
    expect(testStore.getState().$data).toBe("1")
  })

  it("should run diff with async when setting state", async () => {
    const newTestStore = newStoreDefTest({
      reducer({ state, action, diff, async, set }) {
        if (action.type === "set-count") {
          set({ count: action.value })
        }

        if (diff(["count"])) {
          async.promise(async ({ signal }) => {
            await sleep(100, "", signal)
            set({ $data: String(state.count) })
          })
        }

        return state
      },
    })

    const testStore = newTestStore({ count: 0 })
    await vi.advanceTimersByTimeAsync(100)
    await testStore.waitForBootstrap()
    expect(testStore.getState().count).toBe(0)
    expect(testStore.getState().$data).toBe("0")
    testStore.setState({ count: 1 }, { transition: ["set-count"] })
    await vi.advanceTimersByTimeAsync(100)
    expect(testStore.getState().count).toBe(1)
    expect(testStore.getState().$data).toBe("1")
  })

  it("should run diff with dispatch async when setting state", async () => {
    const newTestStore = newStoreDefTest({
      reducer({ state, action, diff, async, set, dispatch }) {
        if (action.type === "set-data") {
          set({ $data: String(state.count) })
        }

        if (action.type === "set-count") {
          set({ count: action.value })
        }

        if (diff(["count"])) {
          async.promise(async ({ signal }) => {
            await sleep(100, "", signal)
            dispatch({ type: "set-data" })
          })
        }

        return state
      },
    })

    const testStore = newTestStore({ count: 0 })
    Object.assign(globalThis, { _testStore: testStore })
    await vi.advanceTimersByTimeAsync(100)
    await testStore.waitForBootstrap()
    expect(testStore.getState().count).toBe(0)
    expect(testStore.getState().$data).toBe("0")
    testStore.setState({ count: 1 }, { transition: ["set-count"] })
    await vi.advanceTimersByTimeAsync(100)
    expect(testStore.getState().count).toBe(1)
    expect(testStore.getState().$data).toBe("1")
  })
})
