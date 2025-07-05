import { expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

it("should not apply changes when set state synchronously", () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set }) {
      if (action.type === "increment") {
        set({ count: 1 })
        throw new Error("test")
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment" })
  expect(store.state.count).toBe(0)
})

it("should not apply changes when set state asynchronously (outside of the callback)", async () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set, async }) {
      if (action.type === "increment") {
        async.promise(async () => {
          await new Promise(res => setTimeout(res, 1))
          set({ count: 1 })
        })
        throw new Error("test")
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.state.count).toBe(0)
})

it("should not apply changes when set state asynchronously (inside of the callback)", async () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set, async }) {
      if (action.type === "increment") {
        async.promise(async () => {
          await new Promise(res => setTimeout(res, 1))
          set({ count: 1 })
          throw new Error("test")
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.state.count).toBe(0)
})

it("should not apply changes when set state based on reducer dispatch", async () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set, dispatch }) {
      if (action.type === "increment") {
        set({ count: 1 })
        dispatch({ type: "derive" })
      }

      if (action.type === "derive") {
        throw new Error("test")
      }

      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment" })
  expect(store.state.count).toBe(0)
})

it("should not apply changes when set state based on async derivation", async () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set, async }) {
      if (action.type === "increment") {
        async.promise(async () => {
          await new Promise(res => setTimeout(res, 1))
          set({ count: 1 })
        })
      }

      if (state.count === 1) {
        throw new Error("test")
      }

      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.state.count).toBe(0)
})
