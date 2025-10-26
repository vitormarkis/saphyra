import { describe, expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

const createNewStore = ({
  defaultPushToHistory,
}: {
  defaultPushToHistory: "ignore" | "push"
}) =>
  newStoreDefTest({
    config: {
      defaults: {
        onPushToHistory:
          defaultPushToHistory === "push"
            ? undefined
            : ({ history }) => history,
      },
    },
    reducer({ state, action, set, async }) {
      if (action.type === "increment-async") {
        async().promise(async () => {
          await new Promise(res => setTimeout(res))
          set(s => ({ count: s.count + 1 }))
        })
      }

      return state
    },
  })

describe("store history tracking", () => {
  test("ensure history is being pushed properly", async () => {
    const newStore = createNewStore({ defaultPushToHistory: "push" })
    const store = newStore({ count: 0 })

    expect(store.history).toStrictEqual([{ count: 0 }])

    await store.dispatchAsync({
      type: "increment-async",
      transition: ["increment"],
    })

    expect(store.history).toStrictEqual([{ count: 0 }, { count: 1 }])
  })

  test("ensure default `onPushToHistory` is being used", async () => {
    const newStore = createNewStore({ defaultPushToHistory: "ignore" })
    const store = newStore({ count: 0 })

    expect(store.history).toStrictEqual([{ count: 0 }])

    await store.dispatchAsync({
      type: "increment-async",
      transition: ["increment"],
    })

    expect(store.history).toStrictEqual([{ count: 0 }])
  })

  test("ensure bootstrap state is being saved as first history entry", async () => {
    const newStore = newStoreDefTest({
      async onConstruct() {
        await new Promise(res => setTimeout(res))
        return { count: 20 }
      },
    })
    const store = newStore({})

    expect(store.history).toStrictEqual([{ count: 20 }])

    await store.dispatchAsync({
      type: "increment-async",
      transition: ["increment"],
    })

    expect(store.history).toStrictEqual([{ count: 20 }, { count: 21 }])
  })
})
