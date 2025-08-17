import { describe, expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

describe("should merge states when resolve transition", () => {
  it("async dispatch and sync set", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          dispatch({ type: "increment-sync" })
        }

        if (action.type === "hover") {
          async().promise(async () => {
            await new Promise(res => setTimeout(res, 1))
            dispatch({ type: "increment" })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment" })
    store.dispatch({ type: "hover", transition: ["test"] })
    await store.waitFor(["test"])
    expect(store.state.count).toBe(2)
  })

  it("sync dispatch and sync set", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(res => setTimeout(res, 1))
            dispatch({ type: "increment-sync" })
          })
        }

        if (action.type === "hover") {
          dispatch({ type: "increment" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    store.dispatch({ type: "hover", transition: ["test"] })
    await store.waitFor(["test"])
    expect(store.state.count).toBe(2)
  })

  it("test callback", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "increment-sync") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment") {
          dispatch({ type: "increment-sync" })
        }

        if (action.type === "hover") {
          dispatch({ type: "increment" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "hover" })
    expect(store.state.count).toBe(1)
  })
})
