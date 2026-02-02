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

  it("should update card title prefix asynchronously when toggling done", async () => {
    // Fake API function that returns prefix based on done state
    const fetchPrefix = async (done: boolean): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return done ? "DONE" : "TODO"
    }

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
                      .getAsync((done, title) => async () => {
                        const prefix = await fetchPrefix(done)
                        return `[${prefix}] ${stripPrefix(title)}`
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

    // Wait for initial async derived computation (uses bootstrap transition)
    await store.awaitFor(["bootstrap"], 100)

    // Initial state should have [TODO] prefix
    const initialState = store.getState()
    expect(initialState.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    )

    // Toggle the card with semantic transition name
    const toggleTransition = ["p1", "c1", "card-1", "toggle-card"]
    store.dispatch({
      type: "toggle-card",
      cardId: "card-1",
      transition: toggleTransition,
    })

    // Assert async value hasn't changed yet (proves async is working)
    const stateAfterDispatch = store.getState()
    expect(stateAfterDispatch.pages[0].columns[0].cards[0].done).toBe(true) // State changed
    expect(stateAfterDispatch.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    ) // Async-derived value still has old value

    // Transition should be happening immediately after dispatch
    expect(store.transitions.isHappening(toggleTransition)).toBe(true)

    // Wait for async derived computation to complete
    await store.awaitFor(toggleTransition, 100)

    // Title should now have [DONE] prefix
    const newState = store.getState()
    expect(newState.pages[0].columns[0].cards[0].done).toBe(true)
    expect(newState.pages[0].columns[0].cards[0].title).toBe("[DONE] Pay bills")

    // Toggle again with semantic transition name
    store.dispatch({
      type: "toggle-card",
      cardId: "card-1",
      transition: toggleTransition,
    })

    // Assert async value hasn't changed yet (proves async is working)
    const stateAfterSecondDispatch = store.getState()
    expect(stateAfterSecondDispatch.pages[0].columns[0].cards[0].done).toBe(
      false
    ) // State changed
    expect(stateAfterSecondDispatch.pages[0].columns[0].cards[0].title).toBe(
      "[DONE] Pay bills"
    ) // Async-derived value still has old value

    // Transition should be happening again
    expect(store.transitions.isHappening(toggleTransition)).toBe(true)

    // Wait for async derived computation to complete
    await store.awaitFor(toggleTransition, 100)

    // Title should be back to [TODO]
    const finalState = store.getState()
    expect(finalState.pages[0].columns[0].cards[0].done).toBe(false)
    expect(finalState.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    )
  })

  it("should handle async prefix updates for multiple cards independently", async () => {
    // Fake API function that returns prefix based on done state
    const fetchPrefix = async (done: boolean): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return done ? "DONE" : "TODO"
    }

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
                  cards: [
                    { id: "card-1", title: "Pay bills", done: false },
                    { id: "card-2", title: "Buy groceries", done: false },
                  ],
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
                      .getAsync((done, title) => async () => {
                        const prefix = await fetchPrefix(done)
                        return `[${prefix}] ${stripPrefix(title)}`
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
              cards: [
                { id: "card-1", title: "Pay bills", done: false },
                { id: "card-2", title: "Buy groceries", done: false },
              ],
            },
          ],
        },
      ],
    })

    // Wait for initial async derived computations (uses bootstrap transition)
    await store.awaitFor(["bootstrap"], 100)

    // Both cards should have [TODO] prefix initially
    const initialState = store.getState()
    expect(initialState.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    )
    expect(initialState.pages[0].columns[0].cards[1].title).toBe(
      "[TODO] Buy groceries"
    )

    // Toggle first card with semantic transition name
    const toggleTransition1 = ["p1", "c1", "card-1", "toggle-card"]
    store.dispatch({
      type: "toggle-card",
      cardId: "card-1",
      transition: toggleTransition1,
    })

    // Assert async value hasn't changed yet (proves async is working)
    const stateAfterFirstDispatch = store.getState()
    expect(stateAfterFirstDispatch.pages[0].columns[0].cards[0].done).toBe(
      true
    ) // State changed
    expect(stateAfterFirstDispatch.pages[0].columns[0].cards[0].title).toBe(
      "[TODO] Pay bills"
    ) // Async-derived value still has old value
    expect(stateAfterFirstDispatch.pages[0].columns[0].cards[1].title).toBe(
      "[TODO] Buy groceries"
    ) // Other card unchanged

    // Transition should be happening for the card we toggled
    expect(store.transitions.isHappening(toggleTransition1)).toBe(true)

    await store.awaitFor(toggleTransition1, 100)

    // First card should be DONE, second should remain TODO
    const afterFirstToggle = store.getState()
    expect(afterFirstToggle.pages[0].columns[0].cards[0].title).toBe(
      "[DONE] Pay bills"
    )
    expect(afterFirstToggle.pages[0].columns[0].cards[1].title).toBe(
      "[TODO] Buy groceries"
    )

    // Toggle second card with semantic transition name
    const toggleTransition2 = ["p1", "c1", "card-2", "toggle-card"]
    store.dispatch({
      type: "toggle-card",
      cardId: "card-2",
      transition: toggleTransition2,
    })

    // Assert async value hasn't changed yet (proves async is working)
    const stateAfterSecondDispatch = store.getState()
    expect(stateAfterSecondDispatch.pages[0].columns[0].cards[1].done).toBe(
      true
    ) // State changed
    expect(stateAfterSecondDispatch.pages[0].columns[0].cards[1].title).toBe(
      "[TODO] Buy groceries"
    ) // Async-derived value still has old value
    expect(stateAfterSecondDispatch.pages[0].columns[0].cards[0].title).toBe(
      "[DONE] Pay bills"
    ) // First card unchanged

    // Transition should be happening for the card we toggled
    expect(store.transitions.isHappening(toggleTransition2)).toBe(true)

    await store.awaitFor(toggleTransition2, 100)

    // Both cards should now be DONE
    const afterSecondToggle = store.getState()
    expect(afterSecondToggle.pages[0].columns[0].cards[0].title).toBe(
      "[DONE] Pay bills"
    )
    expect(afterSecondToggle.pages[0].columns[0].cards[1].title).toBe(
      "[DONE] Buy groceries"
    )
  })
})
