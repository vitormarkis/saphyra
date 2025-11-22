import { describe, expect, test, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"

const newStore = newStoreDefTest({
  config: {
    defaults: {
      transition: ["GENERAL"],
    },
  },
  reducer({ state, action, set, async, diff }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }

    if (action.type === "increment-async") {
      async().promise(async () => {
        await new Promise(res => setTimeout(res))
        set(s => ({ count: s.count + 1 }))
      })
    }

    if (action.type === "set-name") {
      set({ name: action.name })
    }

    diff()
      .on([s => s.name])
      .run(() => {
        async().promise(async () => {
          await new Promise(res => setTimeout(res))
          set(s => ({ result: `processed-${s.name}` }))
        })
      })

    return state
  },
})

describe("ensure default transitions are applied", () => {
  test("dispatch + sync action", async () => {
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment",
    })
    expect(store.getState()).toEqual({ count: 1 })
  })
  test("dispatch + async action", async () => {
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment-async",
    })
    await store.waitFor(["GENERAL"])
    expect(store.getState()).toEqual({ count: 1 })
  })
  test("dispatchAsync + async action", async () => {
    const store = newStore({ count: 0 })
    await store.dispatchAsync({
      type: "increment",
    })
    expect(store.getState()).toEqual({ count: 1 })
  })
  test("dispatchAsync + async action", async () => {
    const store = newStore({ count: 0 })
    await store.dispatchAsync({
      type: "increment-async",
    })
    expect(store.getState()).toEqual({ count: 1 })
  })

  test("async() without transition parameter uses default transition and does not throw", async () => {
    const store = newStore({ count: 0 })
    expect(() => {
      store.dispatch({
        type: "increment-async",
      })
    }).not.toThrow()
    await store.waitFor(["GENERAL"])
    expect(store.getState()).toEqual({ count: 1 })
  })

  test("setState triggering diff watcher with async() uses default transition", async () => {
    const errorHandler = vi.fn()
    const store = newStore(
      { count: 0, name: "", result: "" },
      {
        errorHandlers: [errorHandler],
      }
    )
    store.setState({ name: "test" })
    await store.waitFor(["GENERAL"])
    expect(errorHandler).not.toHaveBeenCalledWith(
      new Error(
        "No transition! If you want to deal with async operations in your reducer, you must pass a transition to your action."
      ),
      null
    )
    expect(store.getState()).toEqual({
      count: 0,
      name: "test",
      result: "processed-test",
    })
  })
})
