import { beforeEach, describe, expect, it, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"

const delay = () => new Promise(resolve => setTimeout(resolve, 1))

type StoreConfig = NonNullable<Parameters<typeof newStoreDefTest>[0]>["config"]

const createStoreWithCountWatcher = (
  errorHandler: ReturnType<typeof vi.fn>,
  config?: StoreConfig
) => {
  const newStore = newStoreDefTest({
    config,
    reducer({ state, set, async, diff }) {
      diff()
        .on([s => s.count])
        .run(count => {
          async().promise(async () => {
            await delay()
            set({ $doubleCount: count * 2 })
          })
        })
      return state
    },
  })
  return (initialState: any) =>
    newStore(initialState, { errorHandlers: [errorHandler] })
}

const createStoreWithDelay = (
  errorHandler: ReturnType<typeof vi.fn>,
  delayMs = 100
) => {
  const newStore = newStoreDefTest({
    reducer({ state, action, async }) {
      if (action.type === "delay") {
        async().promise(
          () => new Promise(resolve => setTimeout(resolve, delayMs))
        )
      }
      return state
    },
  })
  return (initialState: any) =>
    newStore(initialState, { errorHandlers: [errorHandler] })
}

describe("setStateAsync", () => {
  let errorHandler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    errorHandler = vi.fn()
  })
  it("should update state asynchronously", async () => {
    const newStore = createStoreWithCountWatcher(errorHandler)
    const store = newStore({ count: 0 })
    await store.waitForBootstrap()

    const promise = store.setStateAsync({ count: 5 }, ["update"])

    expect(store.getState()).toEqual({ count: 0, $doubleCount: 0 })
    expect(errorHandler).not.toHaveBeenCalled()

    await promise

    expect(store.getState()).toEqual({ count: 5, $doubleCount: 10 })
    expect(store.history).toEqual([
      { count: 0, $doubleCount: 0 },
      { count: 5, $doubleCount: 10 },
    ])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it("should resolve with final state", async () => {
    const newStore = createStoreWithCountWatcher(errorHandler)
    const store = newStore({ count: 0 })
    await store.waitForBootstrap()

    const finalState = await store.setStateAsync({ count: 10 }, ["test"])

    expect(finalState).toEqual({ count: 10, $doubleCount: 20 })
    expect(store.history).toEqual([
      { count: 0, $doubleCount: 0 },
      { count: 10, $doubleCount: 20 },
    ])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it("should work with setter function", async () => {
    const newStore = createStoreWithCountWatcher(errorHandler)
    const store = newStore({ count: 5 })
    await store.waitForBootstrap()

    await store.setStateAsync(s => ({ count: s.count + 3 }), ["increment"])

    expect(store.getState().count).toBe(8)
    expect(store.getState().$doubleCount).toBe(16)
    expect(store.history).toEqual([
      { count: 5, $doubleCount: 10 },
      { count: 8, $doubleCount: 16 },
    ])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it("should handle multiple setStateAsync calls", async () => {
    const newStore = createStoreWithCountWatcher(errorHandler)
    const store = newStore({ count: 0 })
    await store.waitForBootstrap()

    await store.setStateAsync({ count: 1 }, ["update-1"])
    await store.setStateAsync({ count: 2 }, ["update-2"])
    await store.setStateAsync({ count: 3 }, ["update-3"])

    expect(store.getState().count).toBe(3)
    expect(store.getState().$doubleCount).toBe(6)
    expect(store.history).toEqual([
      { count: 0, $doubleCount: 0 },
      { count: 1, $doubleCount: 2 },
      { count: 2, $doubleCount: 4 },
      { count: 3, $doubleCount: 6 },
    ])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it("should use default transition if not provided", async () => {
    const newStore = createStoreWithCountWatcher(errorHandler, {
      defaults: {
        transition: ["DEFAULT"],
      },
    })
    const store = newStore({ count: 0 })
    await store.waitForBootstrap()

    await store.setStateAsync({ count: 42 })

    expect(store.getState().count).toBe(42)
    expect(store.getState().$doubleCount).toBe(84)
    expect(store.history).toEqual([
      { count: 0, $doubleCount: 0 },
      { count: 42, $doubleCount: 84 },
    ])
    expect(errorHandler).not.toHaveBeenCalled()
  })

  describe("abort handling", () => {
    it("should resolve on abort when onAbort is 'resolve'", async () => {
      const newStore = createStoreWithDelay(errorHandler)
      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "delay", transition: ["test"] })

      const promise = store.setStateAsync({ count: 5 }, ["test"], {
        onAbort: "resolve",
      })

      store.abort(["test"])

      await expect(promise).resolves.toBeDefined()
      expect(store.history).toEqual([{ count: 0 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it("should reject on abort when onAbort is 'reject'", async () => {
      const newStore = createStoreWithDelay(errorHandler)
      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "delay", transition: ["test"] })

      const promise = store.setStateAsync({ count: 5 }, ["test"], {
        onAbort: "reject",
      })

      store.abort(["test"])

      await expect(promise).rejects.toBeDefined()
      expect(store.history).toEqual([{ count: 0 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it("should not resolve or reject when onAbort is 'noop'", async () => {
      const newStore = createStoreWithDelay(errorHandler)
      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "delay", transition: ["test"] })

      const promise = store.setStateAsync({ count: 5 }, ["test"], {
        onAbort: "noop",
      })

      store.abort(["test"])

      const settled = await Promise.race([
        promise.then(() => "resolved"),
        promise.catch(() => "rejected"),
        new Promise(resolve => setTimeout(() => resolve("timeout"), 50)),
      ])

      expect(settled).toBe("timeout")
      expect(store.history).toEqual([{ count: 0 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe("signal support", () => {
    it("should throw if signal is already aborted", async () => {
      const newStore = createStoreWithCountWatcher(errorHandler)
      const store = newStore({ count: 0 })
      await store.waitForBootstrap()
      const controller = new AbortController()
      controller.abort()

      expect(() => {
        store.setStateAsync({ count: 5 }, ["test"], {
          signal: controller.signal,
        })
      }).toThrow()
      expect(store.history).toEqual([{ count: 0, $doubleCount: 0 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it("should reject if signal is aborted during execution", async () => {
      const newStore = createStoreWithDelay(errorHandler)
      const store = newStore({ count: 0 })
      await store.waitForBootstrap()
      const controller = new AbortController()

      store.dispatch({ type: "delay", transition: ["test"] })

      const promise = store.setStateAsync({ count: 5 }, ["test"], {
        signal: controller.signal,
      })

      setTimeout(() => controller.abort(), 10)

      await expect(promise).rejects.toMatchObject({ code: 20 })
      expect(store.history).toEqual([{ count: 0 }, { count: 5 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe("history tracking", () => {
    it("should create proper history entries", async () => {
      const newStore = newStoreDefTest({
        reducer({ state, set, async, diff }) {
          diff()
            .on([s => s.count])
            .run(count => {
              async().promise(async () => {
                await delay()
                set({ $doubleCount: count * 2 })
              })
            })
          return state
        },
      })
      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      await store.setStateAsync({ count: 5 }, ["update"])

      expect(store.history).toEqual([
        { count: 0, $doubleCount: 0 },
        { count: 5, $doubleCount: 10 },
      ])
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe("compatibility with dispatchAsync", () => {
    it("should work alongside dispatchAsync", async () => {
      const newStore = newStoreDefTest({
        reducer({ state, action, set, async, diff }) {
          if (action.type === "increment") {
            set(s => ({ count: s.count + 1 }))
          }

          diff()
            .on([s => s.count])
            .run(count => {
              async().promise(async () => {
                await delay()
                set({ $doubleCount: count * 2 })
              })
            })

          return state
        },
      })
      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      await store.dispatchAsync({ type: "increment", transition: ["dispatch"] })

      expect(store.getState().count).toBe(1)
      expect(store.getState().$doubleCount).toBe(2)
      expect(errorHandler).not.toHaveBeenCalled()

      await store.setStateAsync(s => ({ count: s.count + 10 }), ["setState"])

      expect(store.getState().count).toBe(11)
      expect(store.getState().$doubleCount).toBe(22)
      expect(store.history).toEqual([
        { count: 0, $doubleCount: 0 },
        { count: 1, $doubleCount: 2 },
        { count: 11, $doubleCount: 22 },
      ])
      expect(errorHandler).not.toHaveBeenCalled()
    })

    it("should not break existing dispatchAsync functionality", async () => {
      const newStore = newStoreDefTest({
        reducer({ state, action, set, async }) {
          if (action.type === "increment") {
            set(s => ({ count: s.count + 1 }))
          }

          if (action.type === "increment-async") {
            async().promise(async () => {
              await Promise.resolve()
              set(s => ({ count: s.count + 5 }))
            })
          }

          return state
        },
      })
      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      await store.dispatchAsync({
        type: "increment-async",
        transition: ["test"],
      })

      expect(store.getState().count).toBe(5)
      expect(store.history).toEqual([{ count: 0 }, { count: 5 }])
      expect(errorHandler).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should reject on error in async operations", async () => {
      const newStore = newStoreDefTest({
        reducer({ state, action, async }) {
          if (action.type === "noop") {
            async().promise(async () => {
              await delay()
              throw new Error("Test error")
            })
          }
          return state
        },
      })
      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      const promise = store.setStateAsync({ count: 5 }, ["test"])

      await expect(promise).rejects.toThrow("Test error")
      expect(store.history).toEqual([{ count: 0 }])
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Test error" }),
        ["test"]
      )
    })
  })
})
