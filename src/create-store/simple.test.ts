import { expect, MockInstance, vi } from "vitest"
import { newStore } from "~/create-store/test.utils"
import { SomeStoreGeneric } from "~/create-store/types"

let store: SomeStoreGeneric
let spy_completeTransition: MockInstance<any>

beforeEach(() => {
  store = newStore({
    count: 0,
    currentTransition: null,
  })
  spy_completeTransition = vi.spyOn(store, "completeTransition")
})

test("simple dispatch interaction", () => {
  const spy_add = vi.spyOn(store.transitions, "addKey")
  const spy_done = vi.spyOn(store.transitions, "doneKey")

  store.dispatch({ type: "increment" })
  const state = store.getState()
  expect(state).toEqual(expect.objectContaining({ count: 1 }))

  // don't interact with the transition
  expect(spy_add).toHaveBeenCalledTimes(0)
  expect(spy_done).toHaveBeenCalledTimes(0)
})

test("simple dispatch interaction with transition", () => {
  const spy_add = vi.spyOn(store.transitions, "addKey")
  const spy_done = vi.spyOn(store.transitions, "doneKey")

  store.dispatch({
    type: "increment",
    transition: ["increment"],
  })
  const state = store.getState()
  expect(state).toEqual(expect.objectContaining({ count: 1 }))

  expect(spy_add).toHaveBeenCalledTimes(1)
  expect(spy_done).toHaveBeenCalledTimes(1)
})
