import { describe, expect, it, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"

describe("should run reducer dispatch", () => {
  it("sync set", () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "increment") {
          set({ count: 1 })
        }
        if (action.type === "hover") dispatch({ type: "increment" })
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover" })
    expect(store.state.count).toBe(1)
  })

  it("async set", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(res => setTimeout(res, 1))
            set({ count: 1 })
          })
        }
        if (action.type === "hover") dispatch({ type: "increment" })
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover", transition: ["test"] })
    await store.waitFor(["test"])
    expect(store.state.count).toBe(1)
  })

  it("async dispatch in macro task", async () => {
    vi.useFakeTimers()
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          setTimeout(() => {
            dispatch({ type: "increment-sync" })
          })
        }
        if (action.type === "hover") dispatch({ type: "increment" })
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover", transition: ["test"] })
    vi.runAllTimers()
    expect(store.state.count).toBe(1)
    vi.useRealTimers()
  })

  it("async dispatch in macro task TWICE", async () => {
    vi.useFakeTimers()
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          setTimeout(() => {
            dispatch({ type: "increment-sync" })
            dispatch({ type: "increment-sync" })
          })
        }
        if (action.type === "hover") {
          dispatch({ type: "increment" })
          dispatch({ type: "increment" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover", transition: ["test"] })
    vi.runAllTimers()
    expect(store.state.count).toBe(8)
    expect(store.history).toStrictEqual([
      { count: 0 },
      { count: 2 },
      { count: 4 },
      { count: 6 },
      { count: 8 },
    ])
    vi.useRealTimers()
  })

  it("async dispatch in async task TWICE", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          async().setTimeout(() => {
            dispatch({ type: "increment-sync" })
            dispatch({ type: "increment-sync" })
          })
        }
        if (action.type === "hover") {
          dispatch({ type: "increment" })
          dispatch({ type: "increment" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover", transition: ["test"] })
    await store.waitFor(["test"], 50)
    expect(store.state.count).toBe(8)
    expect(store.history).toStrictEqual([{ count: 0 }, { count: 8 }])
  })

  it("async dispatch and set", async () => {
    vi.useFakeTimers()
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          async().setTimeout(() => {
            dispatch({ type: "increment-sync" })
          })
        }
        if (action.type === "hover") {
          const randomTransition = Math.random().toString(36).substring(2, 6)
          dispatch({ type: "increment", transition: [randomTransition] })
          dispatch({ type: "increment", transition: [randomTransition] })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover", transition: ["test"] })
    vi.runAllTimers()
    expect(store.state.count).toBe(4)
    expect(store.history).toStrictEqual([{ count: 0 }, { count: 4 }])
    vi.useRealTimers()
  })
})
