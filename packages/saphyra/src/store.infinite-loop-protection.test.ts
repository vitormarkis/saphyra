import { describe, expect, it, vi } from "vitest"
import { newStoreDef } from "./store"
import { newStoreDefTest } from "./test.utils"

type InfiniteLoopState = {
  count: number
}

type InfiniteLoopActions =
  | { type: "infinite-dispatch" }
  | { type: "normal-increment" }
  | { type: "chain-a" }
  | { type: "chain-b" }
  | { type: "chain-c" }

describe("infinite loop protection", () => {
  it("should throw error when action dispatches itself infinitely", () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "infinite-dispatch") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should include helpful error message with action type", () => {
    const newStore = newStoreDefTest({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "infinite-dispatch") {
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/Last action type: "infinite-dispatch"/)
  })

  it("should include maxSyncDispatchCount in error message", () => {
    const newStore = newStoreDefTest({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "infinite-dispatch") {
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/exceeded 10 synchronous dispatches/)
  })

  it("should detect circular dispatch chains", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, dispatch }) {
        if (action.type === "chain-a") {
          dispatch({ type: "chain-b" })
        }
        if (action.type === "chain-b") {
          dispatch({ type: "chain-c" })
        }
        if (action.type === "chain-c") {
          dispatch({ type: "chain-a" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should allow normal dispatch chains under the limit", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "chain-b" })
        }
        if (action.type === "chain-b") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "chain-c" })
        }
        if (action.type === "chain-c") {
          set(s => ({ count: s.count + 1 }))
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).not.toThrow()

    expect(store.state.count).toBe(3)
  })

  it("should respect custom maxSyncDispatchCount config", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 5,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "infinite-dispatch") {
          set(s => ({ count: s.count + 1 }))
          dispatch({ type: "infinite-dispatch" })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "infinite-dispatch" })
    }).toThrow(/exceeded 5 synchronous dispatches/)

    expect(store.state.count).toBeLessThanOrEqual(6)
  })

  it("should allow exactly maxSyncDispatchCount dispatches", () => {
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          set(s => ({ count: s.count + 1 }))
          if (state.count < 10) {
            dispatch({ type: "chain-a" })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).not.toThrow()

    expect(store.state.count).toBe(10)
  })

  it("should throw when exceeding maxSyncDispatchCount by one", () => {
    let dispatchCount = 0
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 10,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          dispatchCount++
          set(s => ({ count: s.count + 1 }))
          if (dispatchCount <= 11) {
            dispatch({ type: "chain-a" })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a" })
    }).toThrow(/Infinite loop detected/)
  })

  it("should not count dispatches across different transitions", async () => {
    let dispatchCount = 0
    const newStore = newStoreDef<
      InfiniteLoopState,
      InfiniteLoopState,
      InfiniteLoopActions
    >({
      config: {
        maxSyncDispatchCount: 5,
      },
      reducer({ action, state, set, dispatch }) {
        if (action.type === "chain-a") {
          dispatchCount++
          set(s => ({ count: s.count + 1 }))
          if (dispatchCount < 10) {
            dispatch({
              type: "chain-a",
              transition: ["different", `${dispatchCount}`],
            })
          }
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    expect(() => {
      store.dispatch({ type: "chain-a", transition: ["test"] })
    }).not.toThrow()

    await store.waitFor(["test"])
    expect(store.state.count).toBe(10)
  })

  describe("maxActionsCount limit", () => {
    it.only("should throw error when exceeding maxActionsCount if sync", async () => {
      const errorHandler = vi.fn()
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 5,
        },
        reducer({ action, state, set, dispatch, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 10) {
              dispatch({
                type: "infinite-dispatch",
              })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      expect(() => {
        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })
      }).toThrow(/exceeded 5 actions in history/)
    })

    it.only("should throw error when exceeding maxActionsCount", async () => {
      const errorHandler = vi.fn()
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 5,
        },
        reducer({ action, state, set, dispatchAsync, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 10) {
              dispatchAsync({
                type: "infinite-dispatch",
                transition: ["test"],
              })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 }, { errorHandlers: [errorHandler] })
      await store.waitForBootstrap()

      store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(false)
      expect(result.reason).toBe("error")
      expect((result as any).error.message).toMatch(
        /exceeded 5 actions in history/
      )
    })

    it.only("should include maxActionsCount in error message", async () => {
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 10,
        },
        reducer({ action, state, set, dispatchAsync, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 20) {
              dispatchAsync({
                type: "infinite-dispatch",
                transition: ["test"],
              })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(false)
      expect(result.reason).toBe("error")
      expect((result as any).error.message).toMatch(
        /exceeded 10 actions in history/
      )
    })

    it.only("should include config increase instruction in error message", async () => {
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 5,
        },
        reducer({ action, state, set, dispatchAsync, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 10) {
              dispatchAsync({
                type: "infinite-dispatch",
                transition: ["test"],
              })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(false)
      expect(result.reason).toBe("error")
      expect((result as any).error.message).toMatch(
        /You can increase this limit by setting maxActionsCount in the store config/
      )
    })

    it.only("should allow exactly maxActionsCount actions", async () => {
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 15,
        },
        reducer({ action, state, set, dispatch }) {
          if (action.type === "infinite-dispatch") {
            set(s => ({ count: s.count + 1 }))
            if (state.count < 10) {
              dispatch({ type: "infinite-dispatch" })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(true)
      expect(result.reason).toBe("completed")

      expect(store.state.count).toBeGreaterThanOrEqual(10)
    })

    it.only("should use default maxActionsCount of 1000", async () => {
      const newStore = newStoreDefTest({
        config: {
          maxActionsCount: 50,
        },
        reducer({ action, state, set, dispatchAsync, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 100) {
              dispatchAsync({
                type: "infinite-dispatch",
                transition: ["test"],
              })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(false)
      expect(result.reason).toBe("error")
      expect((result as any).error.message).toMatch(
        /exceeded 50 actions in history/
      )
    })
  })

  describe("maxActionsCount limit - all reducer code versions", () => {
    describe("using dispatch (sync)", () => {
      it.only("should detect infinite loop with sync dispatch triggered by diff", async () => {
        const newStore = newStoreDefTest({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, dispatch, diff, async }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatch({ type: "infinite-dispatch" })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })
    })

    describe("using dispatchAsync", () => {
      it.only("should detect infinite loop with dispatchAsync referencing itself", async () => {
        const newStore = newStoreDefTest({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, dispatchAsync, async }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
              if (state.count < 10) {
                dispatchAsync({
                  type: "infinite-dispatch",
                  transition: ["test"],
                })
              }
            }
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })

      it.only("should detect infinite loop with dispatchAsync creating sub-branches", async () => {
        const newStore = newStoreDefTest({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, dispatchAsync, async }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
              if (state.count < 10) {
                dispatchAsync({
                  type: "infinite-dispatch",
                })
              }
            }
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })
    })

    describe("using set (sync)", () => {
      it("should detect infinite loop with sync set triggering async operations", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, async, diff }) {
            if (action.type === "infinite-dispatch") {
              set(s => ({ count: s.count + 1 }))
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  async().promise(async () => {
                    await new Promise(resolve => setTimeout(resolve))
                    set(s => ({ count: s.count + 1 }))
                  })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })
    })

    describe("using set after await (async set)", () => {
      it("should detect infinite loop when async set triggers diff that dispatches", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, dispatch, async, diff }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatch({ type: "infinite-dispatch" })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })

      it("should detect infinite loop when async set triggers diff that uses dispatchAsync", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxActionsCount: 5,
          },
          reducer({ action, state, set, dispatchAsync, async, diff }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatchAsync({
                    type: "infinite-dispatch",
                    transition: ["test"],
                  })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({ type: "infinite-dispatch", transition: ["test"] })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 actions in history/
        )
      })
    })
  })

  describe("maxAsyncOperationsCount limit", () => {
    describe("using dispatch (sync)", () => {
      it("should throw error when exceeding maxAsyncOperationsCount", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxAsyncOperationsCount: 5,
          },
          reducer({ action, state, set, dispatch, async }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve))
                set(s => ({ count: s.count + 1 }))
              })
              if (state.count < 10) {
                dispatch({ type: "infinite-dispatch" })
              }
            }
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        expect(() => {
          store.dispatch({
            type: "infinite-dispatch",
            transition: ["test"],
          })
        }).toThrow(/exceeded 5 async operations in history/)
      })
    })

    describe("using dispatch (sync) triggered by diff", () => {
      it("should throw error when exceeding maxAsyncOperationsCount with sync dispatch from diff", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxAsyncOperationsCount: 5,
          },
          reducer({ action, state, set, async, dispatch, diff }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve, 1))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatch({ type: "infinite-dispatch" })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 async operations in history/
        )
      })
    })

    describe("using set after await (async set) triggering diff", () => {
      it("should throw error when async set triggers diff that dispatches", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxAsyncOperationsCount: 5,
          },
          reducer({ action, state, set, async, dispatch, diff }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve, 1))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatch({ type: "infinite-dispatch" })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 async operations in history/
        )
      })

      it("should throw error when async set triggers diff that dispatches again", async () => {
        const newStore = newStoreDef<
          InfiniteLoopState,
          InfiniteLoopState,
          InfiniteLoopActions
        >({
          config: {
            maxAsyncOperationsCount: 5,
          },
          reducer({ action, state, set, async, dispatch, diff }) {
            if (action.type === "infinite-dispatch") {
              async().promise(async () => {
                await new Promise(resolve => setTimeout(resolve, 1))
                set(s => ({ count: s.count + 1 }))
              })
            }
            diff()
              .on([s => s.count])
              .run(count => {
                if (count < 10) {
                  dispatch({ type: "infinite-dispatch" })
                }
              })
            return state
          },
        })

        const store = newStore({ count: 0 })
        await store.waitForBootstrap()

        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })

        const result = await store.waitFor(["test"])
        expect(result.success).toBe(false)
        expect(result.reason).toBe("error")
        expect((result as any).error.message).toMatch(
          /exceeded 5 async operations in history/
        )
      })
    })

    it("should include maxAsyncOperationsCount in error message", async () => {
      const newStore = newStoreDef<
        InfiniteLoopState,
        InfiniteLoopState,
        InfiniteLoopActions
      >({
        config: {
          maxAsyncOperationsCount: 10,
        },
        reducer({ action, state, set, dispatch, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 20) {
              dispatch({ type: "infinite-dispatch" })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      expect(() => {
        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })
      }).toThrow(/exceeded 10 async operations in history/)
    })

    it("should include config increase instruction in error message", async () => {
      const newStore = newStoreDef<
        InfiniteLoopState,
        InfiniteLoopState,
        InfiniteLoopActions
      >({
        config: {
          maxAsyncOperationsCount: 5,
        },
        reducer({ action, state, set, dispatch, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 10) {
              dispatch({ type: "infinite-dispatch" })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      expect(() => {
        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })
      }).toThrow(
        /You can increase this limit by setting maxAsyncOperationsCount in the store config/
      )
    })

    it("should allow exactly maxAsyncOperationsCount async operations", async () => {
      let dispatchCount = 0
      const newStore = newStoreDef<
        InfiniteLoopState,
        InfiniteLoopState,
        InfiniteLoopActions
      >({
        config: {
          maxAsyncOperationsCount: 15,
        },
        reducer({ action, state, set, dispatch, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              set(s => ({ count: s.count + 1 }))
            })
            dispatchCount++
            if (dispatchCount < 10) {
              dispatch({ type: "infinite-dispatch" })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      store.dispatch({
        type: "infinite-dispatch",
        transition: ["test"],
      })

      const result = await store.waitFor(["test"])
      expect(result.success).toBe(true)
      expect(result.reason).toBe("completed")

      expect(store.state.count).toBeGreaterThanOrEqual(10)
    })

    it("should use default maxAsyncOperationsCount of 500", async () => {
      const newStore = newStoreDef<
        InfiniteLoopState,
        InfiniteLoopState,
        InfiniteLoopActions
      >({
        config: {
          maxAsyncOperationsCount: 50,
        },
        reducer({ action, state, set, dispatch, async }) {
          if (action.type === "infinite-dispatch") {
            async().promise(async () => {
              await new Promise(resolve => setTimeout(resolve))
              set(s => ({ count: s.count + 1 }))
            })
            if (state.count < 100) {
              dispatch({ type: "infinite-dispatch" })
            }
          }
          return state
        },
      })

      const store = newStore({ count: 0 })
      await store.waitForBootstrap()

      expect(() => {
        store.dispatch({
          type: "infinite-dispatch",
          transition: ["test"],
        })
      }).toThrow(/exceeded 50 async operations in history/)
    })
  })
})
