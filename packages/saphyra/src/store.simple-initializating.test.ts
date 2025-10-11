import { expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

it("should initialize properly", async () => {
  const newStore = newStoreDefTest({})

  const store = newStore({ count: 0 })
  expect(store.state.count).toBe(0)
  store.setState({ count: 1 })
  expect(store.state.count).toBe(1)
})
