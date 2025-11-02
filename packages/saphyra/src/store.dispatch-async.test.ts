import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { noop } from "./fn/noop"

test("should create dispatch async sub branch state from parent state", async () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
    },
    reducer({ state, action, set, dispatch, dispatchAsync, async }) {
      if (action.type === "increment") {
        set({ count: state.count + 1 })
      }

      if (action.type === "increment-async") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          await dispatchAsync({ type: "increment" })
          await dispatchAsync({ type: "increment" })
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.getState()).toEqual({ count: 3 })
  expect(store.history).toEqual([{ count: 0 }, { count: 3 }])
})

test("should create dispatch async sub branch state from parent state", async () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
    },
    reducer({ state, action, set, dispatch, dispatchAsync, async }) {
      if (action.type === "increment") {
        const { by = 1 } = action
        set({ count: state.count + by })
      }

      if (action.type === "increment-async") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
          await dispatchAsync({ type: "increment", by: 1 })
          await new Promise(resolve => setTimeout(resolve, 1))
          await dispatchAsync({ type: "increment", by: 2 })
        })
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.getState()).toEqual({ count: 8 })
  expect(store.history).toEqual([{ count: 0 }, { count: 8 }])
})

test("should create dispatch async sub branch state from parent state", async () => {
  const newStore = newStoreDefTest({
    config: {
      onCommitTransition(_props) {
        noop()
      },
    },
    reducer({ state, action, set, dispatch, dispatchAsync, async }) {
      if (action.type === "increment") {
        set({ count: state.count + 1 })
      }

      if (action.type === "increment-nested") {
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
          await dispatchAsync({ type: "increment" })
        })
      }

      if (action.type === "increment-async") {
        dispatch({ type: "increment" })
        async().promise(async () => {
          // this branch start with state as count = 1
          await dispatchAsync({ type: "increment-nested" })
        })
        async().promise(async () => {
          // this branch also start with state as count = 1
          // because they're scheduled and run at the same time
          await dispatchAsync({ type: "increment-nested" })
        })
        // to prevent this, use only one async().promise
      }
      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.getState()).not.toEqual({ count: 3 })
  expect(store.getState()).toEqual({ count: 2 })
  expect(store.history).toEqual([{ count: 0 }, { count: 2 }])
})

test("should discard branch if dispatch async fails", async () => {
  const newStore = newStoreDefTest({
    reducer({ state, action, set, dispatchAsync, async }) {
      if (action.type === "increment-async") {
        async().promise(async () => {
          await Promise.all([
            dispatchAsync({ type: "increment" }),
            dispatchAsync({ type: "increment" }),
            dispatchAsync({ type: "increment", shouldError: true }),
          ])
        })
      }

      if (action.type === "increment") {
        const { shouldError = false } = action
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve))
          if (shouldError) throw new Error("Error")
          set(s => ({ count: s.count + 1 }))
        })
      }

      return state
    },
  })

  const store = newStore({ count: 0 })
  store.dispatch({ type: "increment-async", transition: ["test"] })
  await store.waitFor(["test"])
  expect(store.history).toStrictEqual([{ count: 0 }])
})
