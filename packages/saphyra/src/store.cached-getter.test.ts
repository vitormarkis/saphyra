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

  it("should work correctly with internal dispatch WITH transition", () => {
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
})
