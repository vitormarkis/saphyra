import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

test("should still write to state if called inside subtransition", async () => {
  const newStore = newStoreDefTest({
    reducer({ state, action, set, async }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 })) // ✅ Recommended way
        async().promise(async () => {
          set(s => ({ count: s.count + 1 })) // ❌ Wrong way should also work
          set({ $message: `count is now ${state.count}` })
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  await store.dispatchAsync({ type: "increment", transition: ["increment"] })
  const count = store.getState().count
  const message = store.getState().$message
  expect(count).toBe(2)
  expect(message).toBe("count is now 2")
})
