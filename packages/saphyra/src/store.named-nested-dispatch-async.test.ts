import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

test("should be able to cancel nested dispatch async", async () => {
  const newStore = newStoreDefTest({
    reducer({ state, action, set, async, dispatchAsync, dispatch }) {
      if (action.type === "execute") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          await dispatchAsync({ type: "increment-async", by: 2 })
          await dispatchAsync({ type: "increment-async", by: 3 })
        })
      }

      if (action.type === "increment") {
        const { by = 1 } = action
        set({ count: state.count + by })
      }

      if (action.type === "increment-async") {
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve))
          dispatch({ type: "increment", by: action.by })
        })
      }

      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "execute", transition: ["execute"] })
  await store.waitFor(["execute"])
  expect(store.getState().count).toBe(6)
})
