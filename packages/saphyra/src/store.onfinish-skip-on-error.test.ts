import { beforeEach, afterEach, describe, expect, test, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("onFinish should not run when promise fails", () => {
  test("onFinish callback should not be called when async promise throws", async () => {
    const onFinishCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, async }) {
        if (action.type === "do-something") {
          async()
            .onFinish({
              id: ["revalidate"],
              fn: resolve => {
                onFinishCalled()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              throw new Error("Promise failed")
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store
      .dispatchAsync({
        type: "do-something",
        transition: ["action"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await promise

    expect(onFinishCalled).not.toHaveBeenCalled()
  })

  test("onFinish callback should not be called when async promise rejects", async () => {
    const onFinishCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, async }) {
        if (action.type === "do-something") {
          async()
            .onFinish({
              id: ["revalidate"],
              fn: resolve => {
                onFinishCalled()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              await new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Rejected")), 100)
              )
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store
      .dispatchAsync({
        type: "do-something",
        transition: ["action"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await promise

    expect(onFinishCalled).not.toHaveBeenCalled()
  })

  test("onFinish callback should still be called when promise succeeds", async () => {
    const onFinishCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, set, async }) {
        if (action.type === "do-something") {
          async()
            .onFinish({
              id: ["revalidate"],
              fn: resolve => {
                onFinishCalled()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              set({ value: 1 })
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store.dispatchAsync({
      type: "do-something",
      transition: ["action"],
    })

    await vi.runAllTimersAsync()
    await promise

    expect(onFinishCalled).toHaveBeenCalledTimes(1)
    expect(store.state.value).toBe(1)
  })

  test("onFinish with nested dispatchAsync should not run when main promise fails", async () => {
    const onFinishCalled = vi.fn()
    const revalidateCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, set, async, dispatchAsync }) {
        if (action.type === "revalidate") {
          revalidateCalled()
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 50))
            set({ value: 999 })
          })
        }

        if (action.type === "do-something") {
          async()
            .onFinish({
              id: ["revalidate"],
              fn: (resolve, reject) => {
                onFinishCalled()
                dispatchAsync({
                  type: "revalidate",
                  transition: ["revalidate"],
                })
                  .then(resolve)
                  .catch(reject)

                return () => {}
              },
            })
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              throw new Error("Main promise failed")
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store
      .dispatchAsync({
        type: "do-something",
        transition: ["action"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await promise

    expect(onFinishCalled).not.toHaveBeenCalled()
    expect(revalidateCalled).not.toHaveBeenCalled()
    expect(store.state.value).toBe(0)
  })

  test("multiple async operations - only successful ones should trigger onFinish", async () => {
    const onFinish1Called = vi.fn()
    const onFinish2Called = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, set, async }) {
        if (action.type === "action-success") {
          async()
            .onFinish({
              id: ["finish-1"],
              fn: resolve => {
                onFinish1Called()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              set(s => ({ value: s.value + 1 }))
            })
        }

        if (action.type === "action-fail") {
          async()
            .onFinish({
              id: ["finish-2"],
              fn: resolve => {
                onFinish2Called()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              throw new Error("This one fails")
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise1 = store.dispatchAsync({
      type: "action-success",
      transition: ["success"],
    })

    const promise2 = store
      .dispatchAsync({
        type: "action-fail",
        transition: ["fail"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await Promise.all([promise1, promise2])

    expect(onFinish1Called).toHaveBeenCalledTimes(1)
    expect(onFinish2Called).not.toHaveBeenCalled()
    expect(store.state.value).toBe(1)
  })

  test("onFinish should not run when promise fails immediately (sync throw)", async () => {
    const onFinishCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, async }) {
        if (action.type === "do-something") {
          async()
            .onFinish({
              id: ["revalidate"],
              fn: resolve => {
                onFinishCalled()
                resolve(true)
                return () => {}
              },
            })
            .promise(async () => {
              throw new Error("Immediate failure")
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store
      .dispatchAsync({
        type: "do-something",
        transition: ["action"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await promise

    expect(onFinishCalled).not.toHaveBeenCalled()
  })
})
