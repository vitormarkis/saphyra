import { beforeEach, expect, test, vi } from "vitest"
import { newStore, TestCounterStore } from "~/create-store/test.utils"

let store: TestCounterStore

beforeEach(() => {
  store = newStore({
    count: 0,
  })
})

test("ensure onTransitionEnd callback is being called", async () => {
  vi.useFakeTimers()
  const mockFn = vi.fn()
  store.dispatch({
    type: "increment-async",
    transition: ["increment"],
    onTransitionEnd: mockFn,
  })
  await vi.advanceTimersByTimeAsync(1000)
  expect(mockFn).toHaveBeenCalledTimes(1)
})

test("ensure UI error hander is being called", async () => {
  vi.useFakeTimers()
  const mockFn = vi.fn()
  store.errorHandlers.add(mockFn)
  store.dispatch({
    type: "increment-async-error",
    transition: ["increment"],
  })
  await vi.advanceTimersByTimeAsync(1000)
  expect(mockFn).toHaveBeenCalledTimes(1)
})
