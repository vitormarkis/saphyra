import { describe, expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

describe("ensure proper transition cleanup", () => {
  test.only("success", async () => {
    const newStore = newStoreDefTest({
      derivations: {
        getCount: {
          selectors: [s => s.count],
          evaluator: s => s.count,
        },
      },
      reducer({ state, action, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            set(s => ({ count: s.count + 1 }))
          })
        }

        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.dispatchAsync({
      type: "increment",
      transition: ["incrementkey"],
    })

    expect(Object.keys(store.settersRegistry)).to.not.toContain("incrementkey")
    expect(store.transitions.callbacks.done.keys()).to.not.toContain(
      "incrementkey"
    )

    expect(store.transitions.callbacks.error.keys()).to.not.toContain(
      "incrementkey"
    )
    expect(store.optimisticRegistry.getKeys()).to.not.toContain("incrementkey")
    expect(Object.keys(store.errors.state)).to.not.toContain("incrementkey")

    expect(Object.keys(store.transitionsState.state)).to.not.toContain(
      "incrementkey"
    )
    // expect(Object.keys(store.transitionsState.state)).to.not.toContain(
    //   "incrementkey"
    // )
    expect(Object.keys(store.transitionsState.prevState)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.state.transitions)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.meta.values)).to.not.toContain(
      "incrementkey"
    )
    expect(store.transitions.controllers.getKeys()).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.cleanUpList)).to.not.toContain(
      "incrementkey"
    )
    expect(
      store.transitions.allEvents.handlers["subtransition-done"]
    ).toBeUndefined()
    expect(Object.keys(store.onTransitionEndCallbacks)).to.not.toContain(
      "incrementkey"
    )
    expect(
      store.internal.derivationsRegistry.getGetterGroups()
    ).to.not.toContain("transition:incrementkey")
  })

  test("error", async () => {
    const newStore = newStoreDefTest({
      derivations: {
        getCount: {
          selectors: [s => s.count],
          evaluator: s => s.count,
        },
      },
      reducer({ state, action, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            throw new Error("test")
          })
        }

        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.dispatchAsync({
      type: "increment",
      transition: ["incrementkey"],
    })

    expect(Object.keys(store.settersRegistry)).to.not.toContain("incrementkey")
    expect(store.transitions.callbacks.error.keys()).to.not.toContain(
      "incrementkey"
    )
    expect(store.optimisticRegistry.getKeys()).to.not.toContain("incrementkey")

    expect(Object.keys(store.transitionsState.state)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitionsState.prevState)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.state.transitions)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.meta.values)).to.not.toContain(
      "incrementkey"
    )
    expect(store.transitions.controllers.getKeys()).to.not.toContain(
      "incrementkey"
    )
    expect(store.transitions.callbacks.done.keys()).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.transitions.cleanUpList)).to.not.toContain(
      "incrementkey"
    )
    expect(
      store.transitions.allEvents.handlers["subtransition-done"].size
    ).toBe(0)
    expect(Object.keys(store.onTransitionEndCallbacks)).to.not.toContain(
      "incrementkey"
    )
    expect(Object.keys(store.errors.state)).to.not.toContain("incrementkey")
    expect(
      store.internal.derivationsRegistry.getGetterGroups()
    ).to.not.toContain("transition:incrementkey")
  })
})
