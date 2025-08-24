import { describe, expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { SomeStoreGeneric, Transition } from "./types"

describe("ensure proper transition cleanup", () => {
  test("success", async () => {
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

    ensureAllCleanUp(store, ["incrementkey"], { expectError: false })
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
    await store
      .dispatchAsync({
        type: "increment",
        transition: ["incrementkey"],
      })
      .catch(() => {})

    ensureAllCleanUp(store, ["incrementkey"], { expectError: true })
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
    await store
      .dispatchAsync({
        type: "increment",
        transition: ["incrementkey"],
      })
      .catch(() => {})

    ensureAllCleanUp(store, ["incrementkey"], { expectError: true })
  })

  test("dispatch async", async () => {
    const newStore = newStoreDefTest({
      derivations: {
        getCount: {
          selectors: [s => s.count],
          evaluator: s => s.count,
        },
      },
      reducer({ state, action, async, dispatchAsync, set }) {
        if (action.type === "increment-impl") {
          set(s => ({ count: s.count + 1 }))
        }
        if (action.type === "increment") {
          async().promise(async () => {
            await dispatchAsync({
              type: "increment-impl",
              transition: ["nested"],
            })
          })
        }

        return state
      },
    })

    const store = newStore({ count: 0 })
    await store
      .dispatchAsync({
        type: "increment",
        transition: ["incrementkey"],
      })
      .catch(() => {})

    ensureAllCleanUp(store, ["incrementkey"], { expectError: false })
  })

  test("ensure cleaning up nested dispatch async", () => {
    // CONTROLLERS ARE NOT BEING CLEANED UP
  })
})

type EnsureAllCleanUpProps = {
  expectError?: boolean
}

function ensureAllCleanUp(
  store: SomeStoreGeneric,
  transition: Transition,
  props: EnsureAllCleanUpProps
) {
  const { expectError } = props
  const transitionKey = transition.join(":")

  if (expectError) {
    expect(Object.keys(store.errors.state)).to.toContain(transitionKey)
  } else {
    expect(Object.keys(store.errors.state)).to.not.toContain(transitionKey)
  }

  expect(Object.keys(store.settersRegistry)).to.not.toContain(transitionKey)
  expect(store.transitions.callbacks.done.keys()).to.not.toContain(
    transitionKey
  )

  expect(store.transitions.callbacks.error.keys()).to.not.toContain(
    transitionKey
  )
  expect(store.optimisticRegistry.getKeys()).to.not.toContain(transitionKey)

  expect(Object.keys(store.transitionsState.state)).to.not.toContain(
    transitionKey
  )
  // expect(Object.keys(store.transitionsState.state)).to.not.toContain(
  //   "incrementkey"
  // )
  expect(Object.keys(store.transitionsState.prevState)).to.not.toContain(
    transitionKey
  )
  expect(Object.keys(store.transitions.state.transitions)).to.not.toContain(
    transitionKey
  )
  expect(Object.keys(store.transitions.meta.values)).to.not.toContain(
    transitionKey
  )
  expect(store.transitions.controllers.getKeys()).to.not.toContain(
    transitionKey
  )
  expect(Object.keys(store.transitions.controllers.values)).to.not.toContain(
    transitionKey
  )
  expect(Object.keys(store.transitions.cleanUpList)).to.not.toContain(
    transitionKey
  )
  expect(
    store.transitions.allEvents.handlers["subtransition-done"]
  ).toBeUndefined()
  expect(Object.keys(store.onTransitionEndCallbacks)).to.not.toContain(
    transitionKey
  )
  expect(store.internal.derivationsRegistry.getGetterGroups()).to.not.toContain(
    `transition:${transitionKey}`
  )
  expect(store.parentTransitionRegistry).toStrictEqual({})
  expect(Object.keys(store.parentTransitionRegistry)).to.not.toContain(
    transitionKey
  )
}
