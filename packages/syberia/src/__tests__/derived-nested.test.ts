import { describe, it, expect } from "vitest"
import { newSyberiaStore } from "../store"

type Card = {
  id: string
  title: string
  done: boolean
}

type Column = {
  id: string
  cards: Card[]
}

type Page = {
  id: string
  columns: Column[]
}

type State = {
  pages: Page[]
}

function stripPrefix(title: string): string {
  return title.replace(/^\[(DONE|TODO)\]\s*/, "")
}

describe("Derived nested JSON structure", () => {
  it("should update card title prefix when toggling done", () => {
    const Store = newSyberiaStore<
      State,
      State,
      { type: "toggle-card"; cardId: string }
    >({
      onConstruct() {
        return {
          pages: [
            {
              id: "p1",
              columns: [
                {
                  id: "c1",
                  cards: [{ id: "card-1", title: "Pay bills", done: false }],
                },
              ],
            },
          ],
        }
      },

      derived: d => [
        d
          .from(s => s.pages)
          .key(p => p.id)
          .each((page, d1) =>
            d1
              .from(() => page.columns)
              .key(c => c.id)
              .each((col, d2) =>
                d2
                  .from(() => col.cards)
                  .key(card => card.id)
                  .each((card, d3) =>
                    d3
                      .deps([
                        $ => $.pages[page].columns[col].cards[card].done,
                        $ => $.pages[page].columns[col].cards[card].title,
                      ])
                      .target($ => $.pages[page].columns[col].cards[card].title)
                      .get((done, title) => {
                        // done is any, but should be boolean, since it's the return type of the first dep
                        return done
                          ? `[DONE] ${stripPrefix(title)}`
                          : `[TODO] ${stripPrefix(title)}`
                      })
                  )
              )
          ),
      ],

      reducer({ state, action, set }) {
        if (action.type === "toggle-card") {
          set(prev => ({
            ...prev,
            pages: prev.pages.map(page => ({
              ...page,
              columns: page.columns.map(col => ({
                ...col,
                cards: col.cards.map(card =>
                  card.id === action.cardId
                    ? { ...card, done: !card.done }
                    : card
                ),
              })),
            })),
          }))
        }
        return state
      },
    })

    const store = Store({
      pages: [
        {
          id: "p1",
          columns: [
            {
              id: "c1",
              cards: [{ id: "card-1", title: "Pay bills", done: false }],
            },
          ],
        },
      ],
    })

    // Initial state should have [TODO] prefix
    const initialState = store.getState()
    expect(initialState.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    )

    // Toggle the card
    store.dispatch({ type: "toggle-card", cardId: "card-1" })

    // Title should now have [DONE] prefix
    const newState = store.getState()
    expect(newState.pages[0].columns[0].cards[0].done).toBe(true)
    expect(newState.pages[0].columns[0].cards[0].title).toBe("[DONE] Pay bills")

    // Toggle again
    store.dispatch({ type: "toggle-card", cardId: "card-1" })

    // Title should be back to [TODO]
    const finalState = store.getState()
    expect(finalState.pages[0].columns[0].cards[0].done).toBe(false)
    expect(finalState.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    )
  })
})
