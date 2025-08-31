import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

test("should have meta", () => {
  const newStore = newStoreDefTest({
    reducer({ state }) {
      return state
    },
  })

  const store = newStore({ count: 0 })
  let meta: Record<string, any>
  let runNow = false
  store.dispatch({
    type: "increment",
    transition: ["increment"],
    beforeDispatch: (props: { meta: Record<string, any> }) => {
      runNow = true
      meta = props.meta
    },
  })
  expect(runNow).toBe(true)
  // @ts-expect-error The error is the test assertion itself
  expect(meta).toStrictEqual({})
})
