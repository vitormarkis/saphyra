import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { noop } from "./fn/noop"

test("should create dispatch async sub branch state from parent state", async () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
    },
    reducer({ state, action, set, dispatch, dispatchAsync, async }) {
      if (action.type === "increment") {
        set({ count: state.count + 1 })
      }

      if (action.type === "increment-async") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          await dispatchAsync({ type: "increment" })
          await dispatchAsync({ type: "increment" })
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.getState()).toEqual({ count: 3 })
  expect(store.history).toEqual([{ count: 0 }, { count: 3 }])
})

test("should create dispatch async sub branch state from parent state", async () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
    },
    reducer({ state, action, set, dispatch, dispatchAsync, async }) {
      if (action.type === "increment") {
        const { by = 1 } = action
        set({ count: state.count + by })
      }

      if (action.type === "increment-async") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
          await dispatchAsync({ type: "increment", by: 1 })
          await new Promise(resolve => setTimeout(resolve, 1))
          await dispatchAsync({ type: "increment", by: 2 })
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.getState()).toEqual({ count: 8 })
  expect(store.history).toEqual([{ count: 0 }, { count: 8 }])
})
