import { expect, MockInstance, vi } from "vitest"
import {
  getStoreTransitionInfoSourceShallowCopy,
  newStore,
  deleteBootstrap,
  TestCounterStore,
} from "~/create-store/test.utils"

let store: TestCounterStore
let spy_completeTransition: MockInstance<any>

beforeEach(() => {
  store = newStore({
    count: 0,
    currentTransition: null,
  })
  spy_completeTransition = vi.spyOn(store, "completeTransition")
})

const transitionName = "increment"

beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

test("should handle transition error gracefully", async () => {
  const info_before = deleteBootstrap(
    getStoreTransitionInfoSourceShallowCopy(store)
  )

  expect(info_before.controllers).toStrictEqual({})
  expect(info_before.setters).toStrictEqual({})
  expect(info_before.doneCallbackList).toStrictEqual(new Map())
  expect(info_before.errorCallbackList).toStrictEqual(new Map())
  expect(info_before.transitions).toStrictEqual({})
  expect(info_before.state).toEqual(expect.objectContaining({ count: 0 }))
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)

  store.dispatch({
    type: "increment-async-error",
    transition: ["increment"],
  })

  const info_after = deleteBootstrap(
    getStoreTransitionInfoSourceShallowCopy(store)
  )
  expect(info_after.controllers).toStrictEqual({
    increment: expect.any(AbortController),
  })
  expect(info_after.setters).toStrictEqual({})
  expect(info_after.doneCallbackList).toStrictEqual(
    new Map([["increment", expect.any(Function)]])
  )
  expect(info_after.errorCallbackList).toStrictEqual(
    new Map([["increment", expect.any(Function)]])
  )
  expect(info_after.transitions).toStrictEqual({
    increment: 1,
  })
  expect(info_after.state).toEqual(expect.objectContaining({ count: 0 }))
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)

  await vi.advanceTimersByTimeAsync(1000)

  expect(info_after.controllers).toStrictEqual({
    increment: expect.any(AbortController),
  })
  expect(info_after.setters).toStrictEqual({}) // empty because it never reachs the onSuccess
  expect(info_after.doneCallbackList).toStrictEqual(
    new Map([["increment", null]])
  )
  expect(info_after.errorCallbackList).toStrictEqual(
    new Map([["increment", null]])
  )
  expect(info_after.transitions).toStrictEqual({})
  expect(info_after.state).toEqual(expect.objectContaining({ count: 0 }))
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)
})
