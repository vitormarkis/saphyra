import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  MockInstance,
  test,
  vi,
} from "vitest"
import {
  getStoreTransitionInfoSourceShallowCopy,
  newStore,
  deleteBootstrap,
  TestCounterStore,
} from "./test.utils"

let store: TestCounterStore
let spy_completeTransition: MockInstance<any>
let spy_emitError: MockInstance<any>

beforeEach(() => {
  store = newStore({
    count: 0,
  })
  spy_completeTransition = vi.spyOn(store, "completeTransition")
  spy_emitError = vi.spyOn(store.transitions, "emitError")
})

// const transitionName = "increment"

beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

test("should handle transition error gracefully", async () => {
  const info_before_dispatch = deleteBootstrap(
    getStoreTransitionInfoSourceShallowCopy(store)
  )

  expect(info_before_dispatch.setters).toStrictEqual({})
  expect(info_before_dispatch.doneCallbackList).toStrictEqual(new Map())
  expect(info_before_dispatch.errorCallbackList).toStrictEqual(new Map())
  expect(info_before_dispatch.transitions).toStrictEqual({})
  expect(info_before_dispatch.state).toEqual(
    expect.objectContaining({ count: 0 })
  )
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)

  store.dispatch({
    type: "increment-async-error",
    transition: ["increment"],
  })

  const info_after_dispatch = deleteBootstrap(
    getStoreTransitionInfoSourceShallowCopy(store)
  )
  expect(info_after_dispatch.setters).toStrictEqual({})
  expect(info_after_dispatch.doneCallbackList).toStrictEqual(
    new Map([["increment", expect.any(Function)]])
  )
  expect(info_after_dispatch.errorCallbackList).toStrictEqual(
    new Map([["increment", expect.any(Function)]])
  )
  expect(info_after_dispatch.transitions["increment"].length).toBe(1)
  expect(info_after_dispatch.state).toEqual(
    expect.objectContaining({ count: 0 })
  )
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)

  await vi.advanceTimersByTimeAsync(1000)

  const info_after_error = deleteBootstrap(
    getStoreTransitionInfoSourceShallowCopy(store)
  )

  // const history = getSettersHistory()

  // ensure all the main entities were reseted
  expect(spy_completeTransition).toHaveBeenCalledTimes(0)

  expect(info_after_error.setters).toStrictEqual({}) // empty because it never reachs the onSuccess
  expect(info_after_error.doneCallbackList).toStrictEqual(
    new Map([["increment", null]])
  )
  expect(info_after_error.errorCallbackList).toStrictEqual(
    new Map([["increment", null]])
  )
  expect(info_after_error.transitions["increment"]).toBeUndefined()
  expect(info_after_error.state).toEqual(expect.objectContaining({ count: 0 }))

  expect(spy_emitError).toHaveBeenCalledTimes(1)
})
