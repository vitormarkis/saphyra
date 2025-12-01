import { describe, expect, test, vi } from "vitest"
import { AsyncPromiseOnFinishProps } from "./types"
import { newStoreDefTest } from "./test.utils"

describe("waitFor error detection", () => {
  test("waitFor should return error reason when promise throws", async () => {
    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, async }) {
        if (action.type === "test") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
            throw new Error("Test error")
          })
        }
        return state
      },
    })

    const store = newStore({})

    store.dispatch({
      type: "test",
      transition: ["test"],
    })

    const result = await store.waitFor(["test"], 500)
    expect(result.reason).toBe("error")
  })
})

describe("onFinish hanging transitions when subsequent action fails", () => {
  test("first action transition should resolve when second action with same onFinish id fails", async () => {
    const onFinishCalled = vi.fn()
    const revalidateCalled = vi.fn()

    const newStore = newStoreDefTest({
      onConstruct() {
        return { value: 0 }
      },
      reducer({ state, action, set, async, dispatchAsync, store }) {
        const onFinishRevalidate: AsyncPromiseOnFinishProps = {
          id: ["revalidate"],
          fn: (resolve, reject, { isLast }) => {
            onFinishCalled(action.type)
            dispatchAsync(
              {
                type: "revalidate",
                transition: ["revalidate"],
                beforeDispatch: ({ action, store, transition }) => {
                  if (!isLast()) return
                  store.abort(transition)
                  return action
                },
              },
              { onAbort: "noop" }
            )
              .then(resolve)
              .catch(reject)

            return () => {
              store.abort(["revalidate"])
            }
          },
        }

        if (action.type === "revalidate") {
          revalidateCalled()
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
            set({ value: 999 })
          })
        }

        if (action.type === "action-success") {
          async()
            .onFinish(onFinishRevalidate)
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              set(s => ({ value: s.value + 1 }))
            })
        }

        if (action.type === "action-fail") {
          async()
            .onFinish(onFinishRevalidate)
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              throw new Error("Second action failed")
            })
        }

        return state
      },
    })

    const store = newStore({})

    store.dispatch({
      type: "action-success",
      transition: ["action", "1"],
    })

    store.dispatch({
      type: "action-fail",
      transition: ["action", "2"],
    })

    const [action_1, action_2] = await Promise.all([
      store.waitFor(["action", "1"], 500),
      store.waitFor(["action", "2"], 500),
    ])

    expect(action_2.reason).toBe("error")
    expect(action_1.reason).toBe("completed")

    expect(onFinishCalled).toHaveBeenCalledWith("action-success")
    expect(onFinishCalled).toHaveBeenCalledTimes(1)
    expect(revalidateCalled).not.toHaveBeenCalled()
    expect(store.state.value).toBe(1)
  })
})
