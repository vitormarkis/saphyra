import { expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

it("should not apply changes when set state synchronously", async () => {
  const newStore = newStoreDefTest({
    reducer({ action, state, set, async, dispatch }) {
      if (action.type === "increment") {
        async().promise(async () => {
          // DON'T AWAIT NOTHING
          // await new Promise(resolve => setTimeout(resolve, 1000))
          dispatch({ type: "nested-increment" })
        })
      }
      if (action.type === "nested-increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment", transition: ["increment"] })
  await store.waitFor(["increment"])
  expect(store.state.count).toBe(1)
})
