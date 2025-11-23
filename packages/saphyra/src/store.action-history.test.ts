import { describe, expect, it, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"
import type { OnTransitionEndProps, Transition } from "./types"

const isBootstrapTransition = (transition: Transition) => {
  return transition.join(":") === "bootstrap"
}

const filterBootstrapFromOnCommitTransition = (
  onCommitTransitionCalls: any[],
  props: any
) => {
  if (!isBootstrapTransition(props.transition)) {
    onCommitTransitionCalls.push(props)
  }
}

const pushOnTransitionEnd = (onTransitionEndCalls: any[]) => {
  return ({
    store,
    ...props
  }: OnTransitionEndProps<any, any, any, any, any>) => {
    if (isBootstrapTransition(props.transition ?? [])) {
      return
    }
    onTransitionEndCalls.push(props)
  }
}

describe("action history tracking", () => {
  it("should track bootstrap transition action history", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          onCommitTransitionCalls.push(props)
        },
      },
      async onConstruct(props) {
        await new Promise(resolve => setTimeout(resolve, 100))
        return props.initialProps
      },
      reducer({ diff, state, set, async }) {
        diff()
          .on([s => s.count])
          .run(count => {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              set({ $incrementedCount: count + 1 })
            })
          })
        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.waitForBootstrap()

    const bootstrapCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "bootstrap"
    )
    expect(bootstrapCall).toBeDefined()
    expect(bootstrapCall.actionHistory).toHaveLength(1)
    expect(bootstrapCall.actionHistory[0].action.type).toBe("noop")
    expect(bootstrapCall.actionHistory[0].action.transition).toStrictEqual([
      "bootstrap",
    ])
    expect(bootstrapCall.actionHistory[0].source).toBe("setState")
    expect(bootstrapCall.actionHistory[0].depth).toBe(1)
  })

  it("should track dispatch actions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(1)
    expect(testCall.actionHistory[0].action.type).toBe("increment")
    expect(testCall.actionHistory[0].source).toBe("dispatch")
    expect(testCall.actionHistory[0].depth).toBe(1)
    expect(testCall.actionHistory[0].timestamp).toBeInstanceOf(Date)
  })

  it("should track setState actions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
    })

    const store = newStore({ count: 0 })
    const partialState = { count: 1 }
    store.setState(partialState, { transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(1)
    expect(testCall.actionHistory[0].action.type).toBe("noop")
    expect(testCall.actionHistory[0].source).toBe("setState")
    expect(testCall.actionHistory[0].depth).toBe(1)
    expect(testCall.actionHistory[0].setterOrPartialState).toEqual(partialState)
  })

  it("should track dispatchAsync actions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.dispatchAsync({ type: "increment", transition: ["test"] })

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(1)
    expect(testCall.actionHistory[0].action.type).toBe("increment")
    expect(testCall.actionHistory[0].source).toBe("dispatchAsync")
  })

  it("should track setStateAsync actions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
    })

    const store = newStore({ count: 0 })
    const partialState = { count: 1 }
    await store.setStateAsync(partialState, ["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(1)
    expect(testCall.actionHistory[0].action.type).toBe("noop")
    expect(testCall.actionHistory[0].source).toBe("setStateAsync")
    expect(testCall.actionHistory[0].setterOrPartialState).toEqual(partialState)
  })

  it("should track multiple actions in same transition", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        if (action.type === "start") {
          dispatch({ type: "increment" })
          dispatch({ type: "increment" })
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "start", transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(4)
    expect(testCall.actionHistory[0].source).toBe("dispatch")
    expect(testCall.actionHistory[0].action.type).toBe("start")
    expect(testCall.actionHistory[0].action.transition).toStrictEqual(["test"])
    expect(testCall.actionHistory[1].source).toBe("dispatch")
    expect(testCall.actionHistory[1].action.type).toBe("increment")
    expect(testCall.actionHistory[1].action.transition).toStrictEqual(["test"])
    expect(testCall.actionHistory[2].source).toBe("dispatch")
    expect(testCall.actionHistory[2].action.type).toBe("increment")
    expect(testCall.actionHistory[2].action.transition).toStrictEqual(["test"])
    expect(testCall.actionHistory[3].source).toBe("setState")
  })

  it("should track actions hierarchically in nested transitions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, dispatch, dispatchAsync, async }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        if (action.type === "parent") {
          dispatch({ type: "increment" })
          async().promise(async () => {
            await dispatchAsync({
              type: "increment",
              transition: ["parent", "child"],
            })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "parent", transition: ["parent"] })
    await store.waitFor(["parent"])

    const parentCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "parent"
    )
    const childCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "parent:child"
    )

    expect(parentCall).toBeDefined()
    expect(childCall).toBeDefined()

    expect(parentCall.actionHistory.length).toBeGreaterThanOrEqual(2)

    expect(childCall.actionHistory.length).toBeGreaterThanOrEqual(1)
    expect(childCall.actionHistory[0].action.type).toBe("increment")
    expect(childCall.actionHistory[0].depth).toBe(2)
  })

  it("should include action history in onTransitionEnd", async () => {
    const onTransitionEndCalls: any[] = []
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment",
      transition: ["test"],
      onTransitionEnd: pushOnTransitionEnd(onTransitionEndCalls),
    })
    await store.waitFor(["test"])

    expect(onTransitionEndCalls).toHaveLength(1)
    const props = onTransitionEndCalls[0]
    expect(props.actionHistory).toHaveLength(2)

    // dispatch
    expect(props.actionHistory[0].action.type).toBe("increment")
    expect(props.actionHistory[0].action.transition).toStrictEqual(["test"])
    expect(props.actionHistory[0].source).toBe("dispatch")

    // async() set()
    expect(props.actionHistory[1].action.type).toBe("noop")
    expect(props.actionHistory[1].action.transition).toStrictEqual(["test"])
    expect(props.actionHistory[1].setterOrPartialState).toStrictEqual({
      count: 1,
    })
    expect(props.actionHistory[1].source).toBe("setState")
  })

  it("should include action history in onTransitionEnd on abort", async () => {
    vi.useFakeTimers()
    const onTransitionEndCalls: any[] = []
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000))
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment",
      transition: ["test"],
      onTransitionEnd: pushOnTransitionEnd(onTransitionEndCalls),
    })

    store.abort(["test"])
    await vi.advanceTimersByTimeAsync(1000)

    expect(onTransitionEndCalls).toHaveLength(1)
    const props = onTransitionEndCalls[0]
    expect(props.aborted).toBe(true)
    expect(props.actionHistory).toHaveLength(0)
    vi.useRealTimers()
  })

  it("should not track sync set() calls in reducer", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set }) {
        if (action.type === "increment") {
          // Sync set() - should NOT create action history entry
          set({ count: state.count + 1 })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    // Only the dispatch action should be tracked, not the sync set()
    expect(testCall.actionHistory).toHaveLength(1)
    expect(testCall.actionHistory[0].action.type).toBe("increment")
  })

  it("should track async set() calls in reducer", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            // Async set() - should create action history entry
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    // Should have both the dispatch action and the async set() action
    expect(testCall.actionHistory).toHaveLength(2)
    expect(testCall.actionHistory[0].source).toBe("dispatch")
    expect(testCall.actionHistory[1].source).toBe("setState")
    expect(testCall.actionHistory[1].setterOrPartialState).toEqual({ count: 1 })
  })

  it("should preserve beforeDispatch in action history", async () => {
    const onCommitTransitionCalls: any[] = []
    const beforeDispatchFn = vi.fn(({ action }) => action)
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment",
      transition: ["test"],
      beforeDispatch: beforeDispatchFn,
    })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory).toHaveLength(2)
    expect(testCall.actionHistory[0].action.beforeDispatch).toBe(
      beforeDispatchFn
    )
  })

  it("should clean up action history on commit", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    await store.waitFor(["test"])

    // Action history should be cleaned up after commit
    expect(store.actionHistoryRegistry["test"]).toBeUndefined()
  })

  it("should clean up action history on abort", async () => {
    vi.useFakeTimers()
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000))
            set({ count: state.count + 1 })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment",
      transition: ["test"],
    })

    store.abort(["test"])
    await vi.advanceTimersByTimeAsync(100)

    // Action history should be cleaned up after abort
    expect(store.actionHistoryRegistry["test"]).toBeUndefined()
    vi.useRealTimers()
  })

  it("should track actions with correct depth for nested transitions", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, dispatchAsync, async }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        if (action.type === "parent") {
          async().promise(async () => {
            await dispatchAsync({
              type: "increment",
              transition: ["parent", "child", "grandchild"],
            })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "parent", transition: ["parent"] })
    await store.waitFor(["parent"])

    const grandchildCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "parent:child:grandchild"
    )

    expect(grandchildCall).toBeDefined()
    expect(grandchildCall.actionHistory[0].depth).toBe(3)
  })

  it("should track actions in chronological order", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, dispatch, async }) {
        if (action.type === "increment") {
          set({ count: state.count + 1 })
        }
        if (action.type === "start") {
          dispatch({ type: "increment" })
          // Use async set() to create a setState action history entry
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
          dispatch({ type: "increment" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "start", transition: ["test"] })
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.actionHistory.length).toBeGreaterThanOrEqual(3)

    // Check that timestamps are in chronological order
    for (let i = 1; i < testCall.actionHistory.length; i++) {
      const prevTime = testCall.actionHistory[i - 1].timestamp.getTime()
      const currTime = testCall.actionHistory[i].timestamp.getTime()
      expect(currTime).toBeGreaterThanOrEqual(prevTime)
    }
  })
})
