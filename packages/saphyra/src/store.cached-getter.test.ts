import { describe, expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { DerivationsConfig } from "./types"

type Item = {
  id: number
  value: number
}

const derivations: DerivationsConfig<{ items: Item[] }> = {
  groupedItems: {
    selectors: [(state: { items: Item[] }) => state.items],
    evaluator: (items: Item[]) => {
      return items.reduce(
        (acc, item) => {
          acc[item.id] ??= []
          acc[item.id].push(item)
          return acc
        },
        {} as Record<string, Item[]>
      )
    },
  },
}

describe("cached getter many dispatches", () => {
  it("should work correctly with internal dispatch WITHOUT transition", () => {
    const storeDef = newStoreDefTest({
      derivations,
      reducer: ({ action, dispatch, state, set }) => {
        if (action.type === "execute") {
          dispatch({ type: "add-item" })
          dispatch({ type: "use-cached-getter" })
        }

        if (action.type === "add-item") {
          const newItem = { id: 1, value: 10 }
          set(s => ({ items: [...s.items, newItem] }))
        }

        if (action.type === "use-cached-getter") {
          const groupedItems = state.groupedItems()
          const foundItem = groupedItems[1]?.[0]
          set({ foundValue: foundItem?.value })
        }

        return state
      },
    })

    const store = storeDef({
      items: [] as { id: number; value: number }[],
      foundValue: undefined as number | undefined,
    })

    store.dispatch({
      type: "execute",
    })

    expect(store.state.foundValue).toBe(10)
  })

  describe("should work correctly with internal dispatch WITH transition", () => {
    it("sync two dispatches", () => {
      const storeDef = newStoreDefTest({
        derivations,
        reducer: ({ action, dispatch, state, set }) => {
          if (action.type === "execute") {
            dispatch({ type: "add-item" })
            dispatch({ type: "use-cached-getter" })
          }

          if (action.type === "add-item") {
            const newItem = { id: 1, value: 10 }
            set(s => ({ items: [...s.items, newItem] }))
          }

          if (action.type === "use-cached-getter") {
            const groupedItems = state.groupedItems()
            const foundItem = groupedItems[1]?.[0]
            set({ foundValue: foundItem?.value })
          }

          return state
        },
      })

      const store = storeDef({
        items: [] as { id: number; value: number }[],
        foundValue: undefined as number | undefined,
      })

      store.dispatch({
        type: "execute",
        transition: ["add-item"],
      })

      expect(store.state.foundValue).toBe(10)
    })

    it("use within async promise", async () => {
      const storeDef = newStoreDefTest({
        derivations,
        reducer: ({ action, dispatch, state, set, async }) => {
          if (action.type === "execute") {
            dispatch({ type: "add-item" })
            dispatch({ type: "use-cached-getter" })
          }

          if (action.type === "add-item") {
            const newItem = { id: 1, value: 10 }
            set(s => ({ items: [...s.items, newItem] }))
          }

          if (action.type === "use-cached-getter") {
            async.promise(async () => {
              const groupedItems = state.groupedItems()
              const foundItem = groupedItems[1]?.[0]
              set({ foundValue: foundItem?.value })
            })
          }

          return state
        },
      })

      const store = storeDef({
        items: [] as { id: number; value: number }[],
        foundValue: undefined as number | undefined,
      })

      store.dispatch({
        type: "execute",
        transition: ["add-item"],
      })
      await store.waitFor(["add-item"])

      expect(store.state.foundValue).toBe(10)
    })

    it("use within async promise with await", async () => {
      const storeDef = newStoreDefTest({
        derivations,
        reducer: ({ action, dispatch, state, set, async }) => {
          if (action.type === "execute") {
            dispatch({ type: "add-item" })
            dispatch({ type: "use-cached-getter" })
          }

          if (action.type === "add-item") {
            const newItem = { id: 1, value: 10 }
            set(s => ({ items: [...s.items, newItem] }))
          }

          if (action.type === "use-cached-getter") {
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              const groupedItems = state.groupedItems()
              const foundItem = groupedItems[1]?.[0]
              set({ foundValue: foundItem?.value })
            })
          }

          return state
        },
      })

      const store = storeDef({
        items: [] as { id: number; value: number }[],
        foundValue: undefined as number | undefined,
      })

      store.dispatch({
        type: "execute",
        transition: ["add-item"],
      })
      await store.waitFor(["add-item"])

      expect(store.state.foundValue).toBe(10)
    })

    it("use only async promise with await on handlers", async () => {
      const storeDef = newStoreDefTest({
        derivations,
        reducer: ({ action, dispatch, state, set, async }) => {
          if (action.type === "execute") {
            dispatch({ type: "add-item" })
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 10))
              dispatch({ type: "use-cached-getter" })
            })
          }

          if (action.type === "add-item") {
            const newItem = { id: 1, value: 10 }
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              set(s => ({ items: [...s.items, newItem] }))
            })
          }

          if (action.type === "use-cached-getter") {
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              const groupedItems = state.groupedItems()
              const foundItem = groupedItems[1]?.[0]
              set({ foundValue: foundItem?.value })
            })
          }

          return state
        },
      })

      const store = storeDef({
        items: [] as { id: number; value: number }[],
        foundValue: undefined as number | undefined,
      })

      store.dispatch({
        type: "execute",
        transition: ["add-item"],
      })
      await store.waitFor(["add-item"])

      expect(store.state.foundValue).toBe(10)
    })

    it("all actions are async with await", async () => {
      const storeDef = newStoreDefTest({
        derivations,
        reducer: ({ action, dispatch, state, set, async }) => {
          if (action.type === "execute") {
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              dispatch({ type: "add-item" })

              // Here I need to await add-item to finish to be able to use
              // the cached getter. I am waiting 1 second which is the time
              // that takes the add-item action to finish.
              await new Promise(resolve => setTimeout(resolve, 1))
              dispatch({ type: "use-cached-getter" })
            })
          }

          if (action.type === "add-item") {
            const newItem = { id: 1, value: 10 }
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              set(s => ({ items: [...s.items, newItem] }))
            })
          }

          if (action.type === "use-cached-getter") {
            async.promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 1))
              const groupedItems = state.groupedItems()
              const foundItem = groupedItems[1]?.[0]
              set({ foundValue: foundItem?.value })
            })
          }

          return state
        },
      })

      const store = storeDef({
        items: [] as { id: number; value: number }[],
        foundValue: undefined as number | undefined,
      })

      store.dispatch({
        type: "execute",
        transition: ["add-item"],
      })
      await store.waitFor(["add-item"])

      expect(store.state.foundValue).toBe(10)
    })
  })
})
