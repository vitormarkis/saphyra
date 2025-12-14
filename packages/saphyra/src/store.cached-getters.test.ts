import { describe, expect, it } from "vitest"
import { newStoreDefTest } from "./test.utils"

describe("should be able to read from derivation", () => {
  it("read from derivation", async () => {
    const newStore = newStoreDefTest({
      onConstruct: () => ({
        highlightedPageId: "a",
        pages: [
          { id: "a", title: "Page 1" },
          { id: "b", title: "Page 2" },
        ],
      }),
      derivations: d => ({
        getPagesBy: d()
          .on([s => s.pages])
          .evaluate(pages => {
            const byId: Record<string, (typeof pages)[number]> = {}
            const byTitle: Record<string, (typeof pages)[number]> = {}
            for (const page of pages) {
              byId[page.id] = page
              byTitle[page.title] = page
            }
            return { byId, byTitle }
          }),
      }),
      reducer({ state, diff, set }) {
        diff()
          .on([s => s.highlightedPageId, s => s.getPagesBy()])
          .run((highlightedPageId, pagesBy) => {
            const pagesById = pagesBy.byId
            set({ $highlightedPage: pagesById[highlightedPageId] })
          })
        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.waitForBootstrap()
    expect(store.state.$highlightedPage).toStrictEqual({
      id: "a",
      title: "Page 1",
    })
  })

  it("read from derivation property", async () => {
    const newStore = newStoreDefTest({
      onConstruct: () => ({
        highlightedPageId: "a",
        pages: [
          { id: "a", title: "Page 1" },
          { id: "b", title: "Page 2" },
        ],
      }),
      derivations: d => ({
        getPagesBy: d()
          .on([s => s.pages])
          .evaluate(pages => {
            const byId: Record<string, (typeof pages)[number]> = {}
            const byTitle: Record<string, (typeof pages)[number]> = {}
            for (const page of pages) {
              byId[page.id] = page
              byTitle[page.title] = page
            }
            return { byId, byTitle }
          }),
      }),
      reducer({ state, diff, set }) {
        diff()
          .on([s => s.highlightedPageId, s => s.getPagesBy().byId])
          .run((highlightedPageId, pagesById) => {
            set({ $highlightedPage: pagesById[highlightedPageId] })
          })
        return state
      },
    })

    const store = newStore({ count: 0 })
    await store.waitForBootstrap()
    expect(store.state.$highlightedPage).toStrictEqual({
      id: "a",
      title: "Page 1",
    })
  })
})
