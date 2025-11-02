import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

test("should inherit changes from parent transition if nested dispatch with explicit transition", async () => {
  const newStore = newStoreDefTest({
    reducer({ state, action, dispatch, set, async }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
        dispatch({ type: "increment-nested" })
      }

      if (action.type === "increment-nested") {
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve))
          set(s => ({ count: s.count + 1 }))
        })
      }

      if (state.count % 2 === 0 && !state.isPair) {
        set({ isPair: true })
      }

      if (state.count % 2 !== 0 && state.isPair) {
        set({ isPair: false })
      }

      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.history).toStrictEqual([
    { count: 0, isPair: true },
    { count: 2, isPair: true },
  ])
})
