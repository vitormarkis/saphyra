import { describe, expect, it } from "vitest"
import { newStoreDef } from "./store"

type InfiniteLoopState = {
  count: number
}

type InfiniteLoopActions =
  | { type: "infinite-dispatch" }
  | { type: "normal-increment" }
  | { type: "chain-a" }
  | { type: "chain-b" }
  | { type: "chain-c" }

describe("infinite loop protection", () => {
  it("should throw error when action dispatches itself infinitely", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "infinite-dispatch") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should include helpful error message with action type", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "infinite-dispatch") {
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/Last action type: "infinite-dispatch"/)
  })

  it("should include maxSyncDispatchCount in error message", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "infinite-dispatch") {
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/exceeded 10 synchronous dispatches/)
  })

  it("should detect circular dispatch chains", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "chain-a") {
          dispatch({ type: "chain-b" })
        }
        if (action.type === "chain-b") {
          dispatch({ type: "chain-c" })
        }
        if (action.type === "chain-c") {
          dispatch({ type: "chain-a" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should allow normal dispatch chains under the limit", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "chain-b" })
        }
        if (action.type === "chain-b") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "chain-c" })
        }
        if (action.type === "chain-c") {
          set(s => ({ count: s.count + 1 }))
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).not.toThrow()

    expect(store.state.count).toBe(3)
  })

  it("should respect custom maxSyncDispatchCount config", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 5,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "infinite-dispatch") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/exceeded 5 synchronous dispatches/)

    expect(store.state.count).toBeLessThanOrEqual(6)
  })

  it("should allow exactly maxSyncDispatchCount dispatches", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          set(s => ({ count: s.count + 1 }))
          if (state.count < 10) {
            dispatch({ type: "chain-a" })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).not.toThrow()

    expect(store.state.count).toBe(10)
  })

  it("should throw when exceeding maxSyncDispatchCount by one", () => {
    let dispatchCount = 0
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          dispatchCount++
          set(s => ({ count: s.count + 1 }))
          if (dispatchCount <= 11) {
            dispatch({ type: "chain-a" })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should not count dispatches across different transitions", async () => {
    let dispatchCount = 0
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 5,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          dispatchCount++
          set(s => ({ count: s.count + 1 }))
          if (dispatchCount < 10) {
            dispatch({
              type: "chain-a",
              transition: ["different", `${dispatchCount}`],
            })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a", transition: ["test"] })
    }).not.toThrow()

    await store.waitFor(["test"])
    expect(store.state.count).toBe(10)
  })
})
