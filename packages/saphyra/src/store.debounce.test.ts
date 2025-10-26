import { describe, expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { ExtractActionDispatch } from "./types"

describe("debounce on before dispatch", () => {
  test("default debounce should not work if set as default", async () => {
    const newStore = newStoreDefTest({
      config: {
        defaults: {
          beforeDispatch({ transition, async, store, action }) {
            store.abort(transition)
            async().setTimeout(() => store.dispatch(action), 50)
          },
          transition: ["debounce-test"],
        },
      },
      reducer({ state, action, set, async }) {
        if (action.type === "increment-async") {
          async().promise(async () => {
            set(s => ({ count: s.count + 1 }))
          })
        }

        return state
      },
    })
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment-async",
    })
    await new Promise(res => setTimeout(res, 10)) // mid debounce
    store.dispatch({
      type: "increment-async",
    })
    await new Promise(res => setTimeout(res, 100)) // end debounce
    expect(store.getState()).toEqual({ count: 0 })
  })

  test("debounce as default should work if it's not included on before dispatch action dispatch", async () => {
    const newStore = newStoreDefTest({
      config: {
        defaults: {
          beforeDispatch({ transition, async, store, action }) {
            store.abort(transition)
            const actionWithNoDebounce: ExtractActionDispatch<typeof store> = {
              ...action,
              beforeDispatch: props => props.action,
            }
            async().setTimeout(() => store.dispatch(actionWithNoDebounce), 50)
          },
          transition: ["debounce-test"],
        },
      },
      reducer({ state, action, set, async }) {
        if (action.type === "increment-async") {
          async().promise(async () => {
            set(s => ({ count: s.count + 1 }))
          })
        }

        return state
      },
    })
    const store = newStore({ count: 0 })
    store.dispatch({
      type: "increment-async",
    })
    await new Promise(res => setTimeout(res, 10)) // mid debounce
    store.dispatch({
      type: "increment-async",
    })
    await new Promise(res => setTimeout(res, 100)) // end debounce
    expect(store.getState()).toEqual({ count: 1 })
  })
})
