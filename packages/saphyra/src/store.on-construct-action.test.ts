import { expect, it, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"

it.skip("should not be able to call dispatch or setState synchronously inside onConstruct", () => {
  const mockErrorHandler = vi.fn()
  const newStore = newStoreDefTest({
    onConstruct({ store }) {
      store.dispatch({ type: "test" })
      return {}
    },
  })
  newStore({}, { errorHandlers: [mockErrorHandler] })

  expect(mockErrorHandler).toHaveBeenCalledTimes(1)
})

it("should be able to call dispatch or setState asynchronously inside onConstruct", async () => {
  vi.useFakeTimers()
  const mockErrorHandler = vi.fn()
  const newStore = newStoreDefTest({
    onConstruct({ store }) {
      setTimeout(() => {
        store.dispatch({ type: "test" })
      }, 100)
      return {}
    },
  })
  newStore({}, { errorHandlers: [mockErrorHandler] })
  vi.runAllTimers()
  expect(mockErrorHandler).toHaveBeenCalledTimes(0)
})
