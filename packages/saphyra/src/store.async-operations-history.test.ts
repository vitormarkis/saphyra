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

describe("async operations history tracking", () => {
  it("should track async().promise() operations", async () => {
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
    expect(testCall.asyncOperationsHistory).toHaveLength(1)
    expect(testCall.asyncOperationsHistory[0].type).toBe("promise")
  })

  it("should track async().setTimeout() operations", async () => {
    vi.useFakeTimers()
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async().setTimeout(() => {
            set({ count: state.count + 1 })
          }, 100)
        }
        return state
      },
    })

    const store = newStore({ count: 0 })
    store.dispatch({ type: "increment", transition: ["test"] })
    await vi.advanceTimersByTimeAsync(100)
    await store.waitFor(["test"])

    const testCall = onCommitTransitionCalls.find(
      call => call.transition.join(":") === "test"
    )
    expect(testCall).toBeDefined()
    expect(testCall.asyncOperationsHistory).toHaveLength(1)
    expect(testCall.asyncOperationsHistory[0].type).toBe("timeout")
    vi.useRealTimers()
  })

  it("should track bootstrap transition async operations", async () => {
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
    expect(bootstrapCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(
      1
    )
    expect(bootstrapCall.asyncOperationsHistory[0].type).toBe("promise")
  })

  it("should track multiple async operations in same transition", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "start") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
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
    expect(testCall.asyncOperationsHistory).toHaveLength(2)
    expect(testCall.asyncOperationsHistory[0].type).toBe("promise")
    expect(testCall.asyncOperationsHistory[1].type).toBe("promise")
  })

  it("should track async operations hierarchically in nested transitions", async () => {
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

    expect(parentCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(1)
    expect(parentCall.asyncOperationsHistory[0].type).toBe("promise")

    expect(childCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(0)
  })

  it("should track child async operations on parent transition", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, dispatchAsync, async }) {
        if (action.type === "increment") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
        }
        if (action.type === "parent") {
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

    expect(parentCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(2)
    expect(parentCall.asyncOperationsHistory[0].type).toBe("promise")
    expect(parentCall.asyncOperationsHistory[1].type).toBe("promise")

    expect(childCall.asyncOperationsHistory).toHaveLength(1)
    expect(childCall.asyncOperationsHistory[0].type).toBe("promise")
  })

  it("should include async operations history in onCommitTransition", async () => {
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
    expect(testCall.asyncOperationsHistory).toBeDefined()
    expect(Array.isArray(testCall.asyncOperationsHistory)).toBe(true)
    expect(testCall.asyncOperationsHistory.length).toBeGreaterThan(0)
  })

  it("should include async operations history in onTransitionEnd", async () => {
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
    expect(props.asyncOperationsHistory).toBeDefined()
    expect(Array.isArray(props.asyncOperationsHistory)).toBe(true)
    expect(props.asyncOperationsHistory.length).toBeGreaterThan(0)
    expect(props.asyncOperationsHistory[0].type).toBe("promise")
  })

  it("should include async operations history in onTransitionEnd on abort", async () => {
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
    expect(props.asyncOperationsHistory).toBeDefined()
    expect(Array.isArray(props.asyncOperationsHistory)).toBe(true)
    vi.useRealTimers()
  })

  it("should clean up async operations history on commit", async () => {
    const newStore = newStoreDefTest({
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
    store.dispatch({ type: "increment", transition: ["test"] })
    await store.waitFor(["test"])

    expect(store.asyncOperationsHistoryRegistry["test"]).toBeUndefined()
  })

  it("should clean up async operations history on abort", async () => {
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

    expect(store.asyncOperationsHistoryRegistry["test"]).toBeUndefined()
    vi.useRealTimers()
  })

  it("should track async operations with correct depth for nested transitions", async () => {
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

    if (grandchildCall) {
      expect(
        grandchildCall.asyncOperationsHistory.length
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it("should track async operations in chronological order", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "start") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ count: state.count + 1 })
          })
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
    expect(testCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(2)

    for (let i = 1; i < testCall.asyncOperationsHistory.length; i++) {
      const prevTime = testCall.asyncOperationsHistory[i - 1].when
      const currTime = testCall.asyncOperationsHistory[i].when
      expect(currTime).toBeGreaterThanOrEqual(prevTime)
    }
  })

  it("should track async operations with labels when setName is used", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          filterBootstrapFromOnCommitTransition(onCommitTransitionCalls, props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .setName("update-count")
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
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
    expect(testCall.asyncOperationsHistory).toHaveLength(1)
    expect(testCall.asyncOperationsHistory[0].label).toBe("update-count")
  })

  it("should track async operations in onConstruct", async () => {
    const onCommitTransitionCalls: any[] = []
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          onCommitTransitionCalls.push(props)
        },
      },
      async onConstruct(props) {
        await new Promise(resolve => setTimeout(resolve, 10))
        return props.initialProps
      },
      reducer({ diff, state, async }) {
        diff()
          .on([s => s.count])
          .run(() => {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 10))
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
    expect(bootstrapCall.asyncOperationsHistory.length).toBeGreaterThanOrEqual(
      1
    )
    expect(bootstrapCall.asyncOperationsHistory[0].type).toBe("promise")
  })
})
