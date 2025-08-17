import { describe, expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

describe("diff detection pattern", () => {
  it("should run dispatch async correctly", async () => {
    const newStore = newStoreDefTest({
      reducer({ state, action, set, async, dispatch, dispatchAsync }) {
        if (action.type === "increment") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment-batch") {
          async().promise(async () => {
            await dispatchAsync({ type: "increment-async" })
            await dispatchAsync({ type: "increment-async" })
            await dispatchAsync({ type: "increment-async" })
          })
        }

        if (action.type === "increment-async") {
          async().promise(async () => {
            await Promise.resolve()
            dispatch({ type: "increment" })
          })
        }

        return state
      },
    })

    const store = newStore({ count: 0 })
    Object.assign(globalThis, { store })

    store.dispatch({ type: "increment-batch", transition: ["increment-batch"] })
    await store.waitFor(["increment-batch"])

    expect(store.getState().count).toBe(3)
  })

  it("don't create unnecessary commits", async () => {
    const newStore = newStoreDefTest({
      reducer({ state, action, set, async, dispatch, dispatchAsync }) {
        if (action.type === "increment") {
          set(s => ({ count: s.count + 1 }))
        }

        if (action.type === "increment-batch") {
          async().promise(async () => {
            await dispatchAsync({ type: "increment-async" })
            await dispatchAsync({ type: "increment-async" })
            await dispatchAsync({ type: "increment-async" })
          })
        }

        if (action.type === "increment-async") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            dispatch({ type: "increment" })
          })
        }

        return state
      },
    })

    const store = newStore({ count: 0 })
    expect(store.history).toStrictEqual([{ count: 0 }])

    await store.dispatchAsync({
      type: "increment-batch",
      transition: ["increment-batch"],
    })

    expect(store.history).toStrictEqual([
      {
        count: 0,
      },
      {
        count: 3,
      },
    ])
  })
})
