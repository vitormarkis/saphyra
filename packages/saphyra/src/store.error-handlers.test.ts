import { beforeEach, describe, expect, test, vi } from "vitest"
import { newStoreDef } from "./store"
import { sleep } from "./fn/common"
import { StoreErrorHandler } from "./types"
import { noop } from "./fn/noop"

const createTestStoreWithReducerError = () => {
  return newStoreDef({
    reducer({ state, action, set }) {
      if (action.type === "throw-error") {
        throw new Error("Error in reducer")
      }
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

const createTestStoreWithAsyncPromiseError = () => {
  return newStoreDef({
    reducer({ state, action, set, async }) {
      if (action.type === "async-promise-error") {
        async().promise(async ({ signal }) => {
          await sleep(100, undefined, signal)
          throw new Error("Error in async promise")
        })
      }
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

const createTestStoreWithAsyncTimerError = () => {
  return newStoreDef({
    reducer({ state, action, set, async }) {
      if (action.type === "async-timer-error") {
        async().timer(() => {
          throw new Error("Error in async timer")
        }, 100)
      }
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

const createTestStoreWithOnConstructError = () => {
  return newStoreDef({
    onConstruct() {
      throw new Error("Error in onConstruct")
    },
    reducer({ state, action, set }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

const createTestStoreWithAsyncOnConstructError = () => {
  return newStoreDef({
    async onConstruct({ signal }) {
      await sleep(100, undefined, signal)
      throw new Error("Error in async onConstruct")
    },
    reducer({ state, action, set }) {
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

const createTestStoreWithNestedAsyncError = () => {
  return newStoreDef({
    reducer({ state, action, set, async, dispatch }) {
      if (action.type === "trigger-nested-error") {
        async().promise(async ({ signal }) => {
          await sleep(50, undefined, signal)
          dispatch({
            type: "nested-async-error",
          })
        })
      }
      if (action.type === "nested-async-error") {
        async().promise(async ({ signal }) => {
          await sleep(50, undefined, signal)
          throw new Error("Error in nested async operation")
        })
      }
      if (action.type === "increment") {
        set(s => ({ count: s.count + 1 }))
      }
      return state
    },
  })
}

describe("Error handlers are called in all user land code scenarios", () => {
  let mockErrorHandler: StoreErrorHandler
  let capturedErrors: Array<{ error: unknown; transition: any }>

  beforeEach(() => {
    vi.useFakeTimers()
    capturedErrors = []
    mockErrorHandler = vi.fn((error, transition) => {
      capturedErrors.push({ error, transition })
    })
  })

  describe("Reducer errors", () => {
    test("should call error handler when reducer throws synchronously", () => {
      const createStore = createTestStoreWithReducerError()
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({ type: "throw-error" })

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in reducer"
      )
      expect(capturedErrors[0].transition).toBeUndefined()
    })

    test("should call error handler when reducer throws with transition", () => {
      const createStore = createTestStoreWithReducerError()
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "throw-error",
        transition: ["test-transition"],
      })

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in reducer"
      )
      expect(capturedErrors[0].transition).toEqual(["test-transition"])
    })
  })

  describe("Async promise errors", () => {
    test("should call error handler when async().promise throws", async () => {
      const createStore = createTestStoreWithAsyncPromiseError()
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "async-promise-error",
        transition: ["async-test"],
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in async promise"
      )
      expect(capturedErrors[0].transition).toEqual(["async-test"])
    })

    test("should call error handler when promise rejects", async () => {
      const createStore = newStoreDef({
        reducer({ state, action, set: _set, async }) {
          if (action.type === "async-promise-reject") {
            async().promise(() => {
              return Promise.reject(new Error("Promise rejected"))
            })
          }
          return state
        },
      })
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "async-promise-reject",
        transition: ["async-reject"],
      })

      await vi.advanceTimersByTimeAsync(100)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Promise rejected"
      )
      expect(capturedErrors[0].transition).toEqual(["async-reject"])
    })
  })

  describe("Async timer errors", () => {
    test("should call error handler when async().timer callback throws", async () => {
      const createStore = createTestStoreWithAsyncTimerError()
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "async-timer-error",
        transition: ["timer-test"],
      })

      await vi.advanceTimersByTimeAsync(150)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in async timer"
      )
      expect(capturedErrors[0].transition).toEqual(["timer-test"])
    })

    test("should call error handler when timer callback throws with different error types", async () => {
      const createStore = newStoreDef({
        reducer({ state, action, set: _set, async }) {
          if (action.type === "timer-string-error") {
            async().timer(() => {
              throw "String error"
            }, 100)
          }
          if (action.type === "timer-object-error") {
            async().timer(() => {
              throw { code: 500, message: "Object error" }
            }, 100)
          }
          return state
        },
      })
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "timer-string-error",
        transition: ["timer-string"],
      })

      await vi.advanceTimersByTimeAsync(150)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors[0].error).toBe("String error")
      expect(capturedErrors[0].transition).toEqual(["timer-string"])

      store.dispatch({
        type: "timer-object-error",
        transition: ["timer-object"],
      })

      await vi.advanceTimersByTimeAsync(150)

      expect(mockErrorHandler).toHaveBeenCalledTimes(2)
      expect(capturedErrors[1].error).toEqual({
        code: 500,
        message: "Object error",
      })
      expect(capturedErrors[1].transition).toEqual(["timer-object"])
    })
  })

  describe("onConstruct errors", () => {
    test("should call error handler when onConstruct throws synchronously", () => {
      const createStore = createTestStoreWithOnConstructError()

      try {
        createStore({ count: 0 }, { errorHandlers: [mockErrorHandler] })
      } catch {
        noop()
      }

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in onConstruct"
      )
      expect(capturedErrors[0].transition).toEqual(["bootstrap"])
    })

    test("should call error handler when async onConstruct throws", async () => {
      const createStore = createTestStoreWithAsyncOnConstructError()
      createStore({ count: 0 }, { errorHandlers: [mockErrorHandler] })

      await vi.advanceTimersByTimeAsync(200)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in async onConstruct"
      )
      expect(capturedErrors[0].transition).toEqual(["bootstrap"])
    })
  })

  describe("Nested async errors", () => {
    test("should call error handler for nested async operations", async () => {
      const createStore = createTestStoreWithNestedAsyncError()
      const store = createStore(
        { count: 0 },
        { errorHandlers: [mockErrorHandler] }
      )

      store.dispatch({
        type: "trigger-nested-error",
        transition: ["outer"],
      })

      await vi.advanceTimersByTimeAsync(150)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in nested async operation"
      )
      // The error is associated with the parent transition since nested dispatch inherits it
      expect(capturedErrors[0].transition).toEqual(["outer"])
    })
  })

  describe("Multiple error handlers", () => {
    test("should call all registered error handlers", async () => {
      const mockErrorHandler2 = vi.fn()
      const mockErrorHandler3 = vi.fn()

      const createStore = createTestStoreWithAsyncPromiseError()
      const store = createStore(
        { count: 0 },
        {
          errorHandlers: [
            mockErrorHandler,
            mockErrorHandler2,
            mockErrorHandler3,
          ],
        }
      )

      store.dispatch({
        type: "async-promise-error",
        transition: ["multi-handler-test"],
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(mockErrorHandler2).toHaveBeenCalledTimes(1)
      expect(mockErrorHandler3).toHaveBeenCalledTimes(1)

      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in async promise" }),
        ["multi-handler-test"]
      )
      expect(mockErrorHandler2).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in async promise" }),
        ["multi-handler-test"]
      )
      expect(mockErrorHandler3).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in async promise" }),
        ["multi-handler-test"]
      )
    })

    test("should call error handlers added via registerErrorHandler", async () => {
      const createStore = createTestStoreWithAsyncPromiseError()
      const store = createStore({ count: 0 })

      const unregister = store.registerErrorHandler(mockErrorHandler)

      store.dispatch({
        type: "async-promise-error",
        transition: ["register-test"],
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
      expect(capturedErrors).toHaveLength(1)
      expect(capturedErrors[0].error).toBeInstanceOf(Error)
      expect((capturedErrors[0].error as Error).message).toBe(
        "Error in async promise"
      )
      expect(capturedErrors[0].transition).toEqual(["register-test"])

      unregister()

      store.dispatch({
        type: "async-promise-error",
        transition: ["after-unregister"],
      })

      await vi.advanceTimersByTimeAsync(200)

      expect(mockErrorHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe("Internal Saphyra errors", () => {
    test.each([{ asyncType: "promise" }, { asyncType: "timer" }])(
      "should call error handler when async.$asyncType is used without transition",
      ({ asyncType }) => {
        const createStore = newStoreDef({
          reducer({ state, action, async }) {
            if (action.type === "async-action") {
              async()[asyncType as "promise" | "timer"](async () => {})
            }
            return state
          },
        })
        const store = createStore(
          { count: 0 },
          { errorHandlers: [mockErrorHandler] }
        )

        store.dispatch({ type: "async-action" })

        expect(mockErrorHandler).toHaveBeenCalledTimes(1)
        expect(capturedErrors).toHaveLength(1)
        expect(capturedErrors[0].error).toBeInstanceOf(Error)
        expect((capturedErrors[0].error as Error).message).toBe(
          "No transition! If you want to deal with async operations in your reducer, you must pass a transition to your action."
        )
        expect(capturedErrors[0].transition).toBeUndefined()
      }
    )
  })
})
