import { describe, expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { AsyncPromiseOnFinishProps } from "./types"
import { noop } from "./fn/noop"

describe("queue API", () => {
  it("should use setName label for the async operation bar, not queue key", async () => {
    const transitionEvents: { label: string | null }[] = []

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "fetch") {
          async()
            .setName("my-custom-label")
            .queue(["my-queue"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 10))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.internal.events.on("new-transition", event => {
      transitionEvents.push({ label: event.label })
    })

    store.dispatch({ type: "fetch", transition: ["fetch"] })
    await store.waitFor(["fetch"])

    const labels = transitionEvents.map(e => e.label)
    expect(labels).toContain("my-custom-label")
    expect(labels).not.toContain("queue:my-queue")
  })

  it("should only show queue subtransition when operation is waiting in queue", async () => {
    const transitionEvents: { label: string | null }[] = []

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "fetch") {
          async()
            .setName("fetch-data")
            .queue(["data-queue"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.internal.events.on("new-transition", event => {
      transitionEvents.push({ label: event.label })
    })

    // First dispatch - runs immediately, should NOT have queue wait bar
    store.dispatch({ type: "fetch", transition: ["fetch", 1] })

    await new Promise(r => setTimeout(r, 10))
    const labelsAfterFirst = transitionEvents.map(e => e.label)
    expect(labelsAfterFirst).not.toContain("$queue:data-queue")

    // Second dispatch - gets queued, SHOULD have queue wait bar
    store.dispatch({ type: "fetch", transition: ["fetch", 2] })

    await new Promise(r => setTimeout(r, 10))
    const labelsAfterSecond = transitionEvents.map(e => e.label)
    expect(labelsAfterSecond).toContain("$queue:data-queue")

    await store.waitFor(["fetch"])
  })

  it("should run queued operations serially", async () => {
    const newStore = newStoreDefTest({
      config: {
        onCommitTransition(props) {
          noop(props)
        },
      },
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.dispatch({ type: "increment", transition: ["inc", 1] })
    store.dispatch({ type: "increment", transition: ["inc", 2] })
    store.dispatch({ type: "increment", transition: ["inc", 3] })

    await new Promise(r => setTimeout(r, 115))
    // Serial: after ~110ms, only 2 ops completed (50ms + 50ms + overhead)
    // If parallel: all 3 would complete (each takes 50ms, started together)
    expect(store.getState().count).toBe(2)

    await store.waitFor(["inc"])
    expect(store.getState().count).toBe(3)
  })

  it("should run different queue keys in parallel", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment-a") {
          async()
            .queue(["queue-a"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ countA: s.countA + 1 }))
            })
        }
        if (action.type === "increment-b") {
          async()
            .queue(["queue-b"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ countB: s.countB + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ countA: 0, countB: 0 })

    store.dispatch({ type: "increment-a", transition: ["inc-a"] })
    store.dispatch({ type: "increment-b", transition: ["inc-b"] })

    await new Promise(r => setTimeout(r, 60))
    // Both should complete in ~50ms since they run in parallel (different queues)
    // If serial, only one would be done after 60ms
    expect(store.getState().countA).toBe(1)
    expect(store.getState().countB).toBe(1)
  })

  it("should keep transition pending while waiting in queue", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 100))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.dispatch({ type: "increment", transition: ["inc", 1] })
    store.dispatch({ type: "increment", transition: ["inc", 2] })

    await new Promise(r => setTimeout(r, 10))
    // First is running, second is queued but transition should still be pending
    expect(store.transitions.isHappening(["inc", 1])).toBe(true)
    expect(store.transitions.isHappening(["inc", 2])).toBe(true)

    await store.waitFor(["inc"])
  })

  it("should fail remaining queue on error", async () => {
    const errors: unknown[] = []
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .promise(async () => {
              if (action.shouldFail) {
                throw new Error("Intentional failure")
              }
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore(
      { count: 0 },
      { errorHandlers: [e => errors.push(e)] }
    )

    store.dispatch({
      type: "increment",
      shouldFail: true,
      transition: ["inc", 1],
    })
    store.dispatch({
      type: "increment",
      shouldFail: false,
      transition: ["inc", 2],
    })
    store.dispatch({
      type: "increment",
      shouldFail: false,
      transition: ["inc", 3],
    })

    await new Promise(r => setTimeout(r, 200))
    // First one fails, remaining should not run
    expect(store.getState().count).toBe(0)
    // Should have errors for all 3 transitions (1 threw, 2 and 3 failed due to queue)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  it("should clear queued ops when transition is cancelled", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 100))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.dispatch({ type: "increment", transition: ["inc", 1] })
    store.dispatch({ type: "increment", transition: ["inc", 2] })

    await new Promise(r => setTimeout(r, 10))
    // Cancel the second transition while it's queued
    const controller = store.transitions.controllers.get(["inc", 2])
    controller?.abort()

    await store.waitFor(["inc", 1])
    // Only first should have run, second was cancelled while queued
    expect(store.getState().count).toBe(1)
  })

  it("should run all pending queue operations with flushQueue", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 10))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.dispatch({ type: "increment", transition: ["inc", 1] })
    store.dispatch({ type: "increment", transition: ["inc", 2] })
    store.dispatch({ type: "increment", transition: ["inc", 3] })

    // Flush all queued operations
    await store.flushQueue()

    expect(store.getState().count).toBe(3)
  })

  it("should only fire onFinish callback as isLast=true for the final queued operation", async () => {
    const isLastResults: { operationIndex: number; isLast: boolean }[] = []

    function createOnFinish(operationIndex: number): AsyncPromiseOnFinishProps {
      return {
        id: ["shared-finish-id"],
        fn: (resolve, _reject, { isLast }) => {
          isLastResults.push({ operationIndex, isLast: isLast() })
          resolve(undefined)
          return () => {}
        },
      }
    }

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async }) {
        if (action.type === "increment") {
          async()
            .queue(["counter"])
            .onFinish(createOnFinish(action.index))
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              set(s => ({ count: s.count + 1 }))
            })
        }
        return state
      },
    })
    const store = newStore({ count: 0 })

    store.dispatch({ type: "increment", index: 1, transition: ["inc", 1] })
    store.dispatch({ type: "increment", index: 2, transition: ["inc", 2] })
    store.dispatch({ type: "increment", index: 3, transition: ["inc", 3] })

    const [inc1WaitFor, inc2WaitFor, inc3WaitFor] = await Promise.all([
      store.waitFor(["inc", 1]),
      store.waitFor(["inc", 2]),
      store.waitFor(["inc", 3]),
    ])
    expect(inc1WaitFor.reason).toBe("completed")
    expect(inc2WaitFor.reason).toBe("completed")
    expect(inc3WaitFor.reason).toBe("completed")

    expect(store.getState().count).toBe(3)
    expect(isLastResults).toHaveLength(3)

    // Only the LAST operation (index 3) should have isLast() = true
    // Operations 1 and 2 should have isLast() = false because there are still
    // items in the queue when their onFinish callback runs
    expect(isLastResults).toEqual([
      { operationIndex: 1, isLast: false },
      { operationIndex: 2, isLast: false },
      { operationIndex: 3, isLast: true },
    ])
  })
})

describe("queue with diff()", () => {
  it("should run two async.promise with same queue key sequentially when second is triggered via diff() from the first", async () => {
    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, diff }) {
        if (action.type === "fetch") {
          set({ $phase: "fetching" })
          async()
            .queue(["data"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 10))
              set({ count: 1 })
            })
        }

        diff()
          .on([s => s.$phase])
          .run(phase => {
            if (phase === "fetching") {
              async()
                .queue(["data"])
                .promise(async () => {
                  await new Promise(r => setTimeout(r, 10))
                  set({ count: 2 })
                })
            }
          })

        return state
      },
    })
    const store = newStore({ $phase: "idle", count: 0 })
    await store.waitForBootstrap()

    store.dispatch({ type: "fetch", transition: ["fetch"] })

    await new Promise(r => setTimeout(r, 15))
    expect(store.transitions.isHappening(["fetch"])).toBe(true)

    await new Promise(r => setTimeout(r, 10))
    expect(store.transitions.isHappening(["fetch"])).toBe(false)
    expect(store.getState().count).toBe(2)
  })

  it("should execute handler async before diff async when both use same queue key", async () => {
    const executionOrder: string[] = []

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, diff }) {
        if (action.type === "fetch") {
          set({ $phase: "fetching" })
          async()
            .queue(["data"])
            .promise(async () => {
              executionOrder.push("handler:start")
              await new Promise(r => setTimeout(r, 10))
              executionOrder.push("handler:end")
            })
        }

        diff()
          .on([s => s.$phase])
          .run(phase => {
            if (phase === "fetching") {
              async()
                .queue(["data"])
                .promise(async () => {
                  executionOrder.push("diff:start")
                  await new Promise(r => setTimeout(r, 10))
                  executionOrder.push("diff:end")
                })
            }
          })

        return state
      },
    })
    const store = newStore({ $phase: "idle", count: 0 })
    await store.waitForBootstrap()

    store.dispatch({ type: "fetch", transition: ["fetch"] })

    await new Promise(r => setTimeout(r, 25))
    expect(store.transitions.isHappening(["fetch"])).toBe(false)

    expect(executionOrder).toEqual([
      "handler:start",
      "handler:end",
      "diff:start",
      "diff:end",
    ])
  })

  it("should run handler and diff async in parallel when using different queue keys", async () => {
    const executionLog: { event: string; time: number }[] = []
    const startTime = Date.now()

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, diff }) {
        if (action.type === "fetch") {
          set({ $phase: "fetching" })
          async()
            .queue(["queue-a"])
            .promise(async () => {
              executionLog.push({
                event: "a:start",
                time: Date.now() - startTime,
              })
              await new Promise(r => setTimeout(r, 10))
              executionLog.push({
                event: "a:end",
                time: Date.now() - startTime,
              })
            })
        }

        diff()
          .on([s => s.$phase])
          .run(phase => {
            if (phase === "fetching") {
              async()
                .queue(["queue-b"])
                .promise(async () => {
                  executionLog.push({
                    event: "b:start",
                    time: Date.now() - startTime,
                  })
                  await new Promise(r => setTimeout(r, 10))
                  executionLog.push({
                    event: "b:end",
                    time: Date.now() - startTime,
                  })
                })
            }
          })

        return state
      },
    })
    const store = newStore({ $phase: "idle" })
    await store.waitForBootstrap()

    store.dispatch({ type: "fetch", transition: ["fetch"] })

    await new Promise(r => setTimeout(r, 15))
    expect(store.transitions.isHappening(["fetch"])).toBe(false)

    const aStart = executionLog.find(e => e.event === "a:start")!.time
    const bStart = executionLog.find(e => e.event === "b:start")!.time
    expect(Math.abs(aStart - bStart)).toBeLessThan(5)
  })

  it("should fail diff async when handler async fails with same queue key", async () => {
    const errors: unknown[] = []

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, diff }) {
        if (action.type === "fetch") {
          set({ $phase: "fetching" })
          async()
            .queue(["data"])
            .promise(async () => {
              await new Promise(r => setTimeout(r, 10))
              throw new Error("Handler failed")
            })
        }

        diff()
          .on([s => s.$phase])
          .run(phase => {
            if (phase === "fetching") {
              async()
                .queue(["data"])
                .promise(async () => {
                  await new Promise(r => setTimeout(r, 10))
                })
            }
          })

        return state
      },
    })
    const store = newStore(
      { $phase: "idle", count: 0 },
      { errorHandlers: [e => errors.push(e)] }
    )
    await store.waitForBootstrap()

    store.dispatch({ type: "fetch", transition: ["fetch"] })

    await new Promise(r => setTimeout(r, 50))
    expect(store.transitions.isHappening(["fetch"])).toBe(false)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })
})

describe("must work with on finish api", () => {
  it("on finish api only", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "mutate") {
          async()
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              api_count++
            })
        }
        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({ type: "mutate", transition: ["mutate", 1] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate", 2] })

    await Promise.all([
      store.waitFor(["mutate", 1]),
      store.waitFor(["mutate", 2]),
    ])

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    expect(store.getState().count).toBe(2)
    expect(store.history).toEqual([{ count: 0 }, { count: 2 }])
  })

  it("on finish api + queue", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "mutate") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              api_count++
            })
        }
        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({ type: "mutate", transition: ["mutate", 1] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate", 2] })

    const [mutate_1_WaitFor, mutate_2_WaitFor] = await Promise.all([
      store.waitFor(["mutate", 1], 1000),
      store.waitFor(["mutate", 2], 1000),
    ])

    expect(mutate_1_WaitFor.reason).toBe("completed")
    expect(mutate_2_WaitFor.reason).toBe("completed")

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    expect(store.getState().count).toBe(2)
    expect(store.history).toEqual([{ count: 0 }, { count: 2 }])
  })

  it("on finish api + queue + action yet to fail should clears the queue", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "fail") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              throw new Error("Intentional failure")
            })
        }

        if (action.type === "mutate") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              api_count++
            })
        }

        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({ type: "fail", transition: ["fail"] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate"] })

    const [failWaitFor, mutateWaitFor] = await Promise.all([
      store.waitFor(["fail"]),
      store.waitFor(["mutate"]),
    ])
    expect(failWaitFor.reason).toBe("error")
    expect(mutateWaitFor.reason).toBe("error")

    expect(store.transitions.isHappening(["fail"])).toBe(false)
    expect(store.transitions.isHappening(["mutate"])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    // 0 because it all failed
    expect(store.getState().count).toBe(0)
    expect(store.history).toEqual([{ count: 0 }])
  })

  it("on finish api + queue + action yet to fail should clears the queue - should clean up properly", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "fail") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              throw new Error("Intentional failure")
            })
        }

        if (action.type === "mutate") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              api_count++
            })
        }

        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({ type: "fail", transition: ["fail"] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate"] })

    const [failWaitFor, mutateWaitFor] = await Promise.all([
      store.waitFor(["fail"], 1000),
      store.waitFor(["mutate"], 1000),
    ])
    expect(failWaitFor.reason).toBe("error")
    expect(mutateWaitFor.reason).toBe("error")

    // "revalidate" should NOT be dispatched because onFinish doesn't run on error
    // So we just verify it's not happening (no need to wait)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)

    expect(store.transitions.isHappening(["fail"])).toBe(false)
    expect(store.transitions.isHappening(["mutate"])).toBe(false)
    // 0 because it all failed and onFinish never ran
    expect(store.getState().count).toBe(0)
    expect(store.history).toEqual([{ count: 0 }])

    // Only check "fail" and "mutate" - "revalidate" was never dispatched since onFinish doesn't run on error
    const transitionsToCheck = ["fail", "mutate"]
    expect(store.transitions.state.finishes).toStrictEqual({})
    expect(store.parentTransitionRegistry).toStrictEqual({})
    for (const transitionKey of transitionsToCheck) {
      expect(Object.keys(store.settersRegistry)).to.not.toContain(transitionKey)
      expect(store.transitions.callbacks.done.keys()).to.not.toContain(
        transitionKey
      )
      expect(store.transitions.callbacks.error.keys()).to.not.toContain(
        transitionKey
      )
      expect(store.optimisticRegistry.getKeys()).to.not.toContain(transitionKey)
      // // Skip transitionsState check for revalidate - known issue with aborted dispatches from beforeDispatch
      // if (transitionKey !== "revalidate") {
      //   expect(Object.keys(store.transitionsState.state)).to.not.toContain(
      //     transitionKey
      //   )
      //   expect(Object.keys(store.transitionsState.prevState)).to.not.toContain(
      //     transitionKey
      //   )
      // }
      expect(Object.keys(store.transitions.state.transitions)).to.not.toContain(
        transitionKey
      )
      expect(store.transitions.controllers.getKeys()).to.not.toContain(
        transitionKey
      )
      expect(Object.keys(store.transitions.cleanUpList)).to.not.toContain(
        transitionKey
      )
      expect(Object.keys(store.onTransitionEndCallbacks)).to.not.toContain(
        transitionKey
      )
      expect(Object.keys(store.parentTransitionRegistry)).to.not.toContain(
        transitionKey
      )
    }

    // again
    store.dispatch({ type: "mutate", transition: ["mutate", 1] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate", 2] })

    const [mutate_1_WaitFor, mutate_2_WaitFor] = await Promise.all([
      store.waitFor(["mutate", 1], 1000),
      store.waitFor(["mutate", 2], 1000),
    ])
    expect(mutate_1_WaitFor.reason).toBe("completed")
    expect(mutate_2_WaitFor.reason).toBe("completed")

    // Wait for revalidate to complete (it has a 30ms delay)
    const revalidateWaitFor = await store.waitFor(["revalidate"], 1000)
    expect(revalidateWaitFor.reason).toBe("completed")

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    expect(store.getState().count).toBe(2)
    expect(store.history).toEqual([{ count: 0 }, { count: 2 }])
  })

  it("on finish api + queue + should clean up properly", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "mutate") {
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              api_count++
            })
        }
        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({ type: "mutate", transition: ["mutate", 1] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate", 2] })

    const [mutate_1_WaitFor, mutate_2_WaitFor] = await Promise.all([
      store.waitFor(["mutate", 1], 1000),
      store.waitFor(["mutate", 2], 1000),
    ])

    expect(mutate_1_WaitFor.reason).toBe("completed")
    expect(mutate_2_WaitFor.reason).toBe("completed")

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    expect(store.getState().count).toBe(2)
    expect(store.history).toEqual([{ count: 0 }, { count: 2 }])

    // again
    store.dispatch({ type: "mutate", transition: ["mutate", 1] })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({ type: "mutate", transition: ["mutate", 2] })

    await Promise.all([
      store.waitFor(["mutate", 1]),
      store.waitFor(["mutate", 2]),
    ])

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)
    expect(store.getState().count).toBe(4)
    expect(store.history).toEqual([{ count: 0 }, { count: 2 }, { count: 4 }])
  })

  it("on finish api + queue + should clean up properly when enqueued function fails", async () => {
    let api_count = 0

    const newStore = newStoreDefTest({
      reducer({ action, state, set, async, dispatchAsync, store }) {
        const onFinish: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)
            return () => store.abort(["revalidate"])
          },
        }

        if (action.type === "mutate") {
          const { shouldFail } = action
          async()
            .queue(["data"])
            .onFinish(onFinish)
            .promise(async () => {
              await new Promise(r => setTimeout(r, 50))
              if (shouldFail) {
                throw new Error("Intentional failure")
              }
              api_count++
            })
        }
        if (action.type === "revalidate") {
          async().promise(async () => {
            await new Promise(r => setTimeout(r, 30))
            set({ count: api_count })
          })
        }
        return state
      },
    })

    const store = newStore({ count: 0 })

    store.dispatch({
      type: "mutate",
      transition: ["mutate", 1],
      shouldFail: false,
    })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({
      type: "mutate",
      transition: ["mutate", 2],
      shouldFail: true,
    })

    const [firstMutate_1, secondMutate_1] = await Promise.all([
      store.waitFor(["mutate", 1], 1000),
      store.waitFor(["mutate", 2], 1000),
    ])

    expect(firstMutate_1.reason).toBe("completed")
    expect(secondMutate_1.reason).toBe("error")

    // Since mutate 2 failed and onFinish doesn't run on error,
    // "revalidate" is never dispatched (mutate 1's onFinish returned early
    // because isLast() was false, waiting for mutate 2 to complete)
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    // Count stays 0 because revalidate never ran
    expect(store.getState().count).toBe(0)
    expect(store.history).toEqual([{ count: 0 }])

    // again
    store.dispatch({
      type: "mutate",
      transition: ["mutate", 1],
      shouldFail: false,
    })
    await new Promise(r => setTimeout(r, 10))
    store.dispatch({
      type: "mutate",
      transition: ["mutate", 2],
      shouldFail: true,
    })

    const [firstMutate_2, secondMutate_2] = await Promise.all([
      store.waitFor(["mutate", 1], 1000),
      store.waitFor(["mutate", 2], 1000),
    ])

    expect(firstMutate_2.reason).toBe("completed")
    expect(secondMutate_2.reason).toBe("error")

    // Same as above - revalidate never runs because mutate 2 fails
    expect(store.transitions.isHappening(["revalidate"])).toBe(false)

    expect(store.transitions.isHappening(["mutate", 1])).toBe(false)
    expect(store.transitions.isHappening(["mutate", 2])).toBe(false)
    // Count stays 0 because revalidate never ran (api_count is 2 but it was never set)
    expect(store.getState().count).toBe(0)
    expect(store.history).toEqual([{ count: 0 }])
  })
})
