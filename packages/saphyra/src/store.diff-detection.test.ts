import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { newStoreDef } from "./store"

describe("diff detection pattern", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  let counter = 0
  const getNewCounter = () => {
    counter++
    if (counter === 20) throw new Error("Entered in a loop.")
    return counter
  }

  it("should evaluate `prevState` with the correct value", async () => {
    vi.useRealTimers()
    const newStore = newStoreDef({
      reducer({ prevState, state, action, set, async }) {
        if (action.type === "add-item") {
          // whenever this `setter` is called, a new `data` reference is created
          // this problem only happens with setters, partial states are fine
          set(() => ({ data: getNewCounter() }))
        }

        // this diff is always true because the `data` from the `set` and the one
        // from the `transition state` are different references because each one of
        // them runned the setter to create a new version of the state
        // which caused them to have different `data` references
        if (prevState.data !== state.data) {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            // this `set` is async, it will run the reducer again, but with which state?
            // It'll get the state from the `transition state`, which didn't updated
            // the `prevState` and the `state` correctly
            set({ processed: true })
          })
        }

        return state
      },
    })

    const store = newStore({ data: getNewCounter(), processed: false })
    Object.assign(globalThis, { store })
    await store.waitForBootstrap()

    expect(store.getState().data).toBe(1)
    expect(store.getState().processed).toBe(true)

    store.dispatch({ type: "add-item", transition: ["add-item"] })
    await store.waitFor(["add-item"])

    expect(store.transitions.state.transitions["add-item"]).toBeUndefined() // transition should be over by now
    // should be 2, but since all the setters re-run when comitting the transition, it incremented one more time.
    expect(store.getState().data).toBe(3)
    expect(store.getState().processed).toBe(true)
    // await new Promise(resolve => setTimeout(resolve, 500))
  })
})
