import { describe, expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

const newStore = newStoreDefTest({
  config: {
    defaults: {
      transition: ["GENERAL"],
    },
  },
  reducer({ state, action, set, async }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }

    if (action.type === "increment-async") {
      async().promise(async () => {
        await new Promise(res => setTimeout(res))
        set(s => ({ count: s.count + 1 }))
      })
    }
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
})
