import { describe, it, expect } from "vitest"
import { TransitionsStore } from "../transitions-store"

describe("TransitionsStore", () => {
  it("should track async work items per transition", () => {
    const store = new TransitionsStore()
    const transition = ["fetch-data"]

    expect(store.isHappening(transition)).toBe(false)

    store.add(transition, { id: "item-1", when: Date.now() })
    expect(store.isHappening(transition)).toBe(true)
    expect(store.getItems(transition).length).toBe(1)

    store.add(transition, { id: "item-2", when: Date.now() })
    expect(store.getItems(transition).length).toBe(2)

    store.done(transition, "item-1")
    expect(store.getItems(transition).length).toBe(1)
    expect(store.isHappening(transition)).toBe(true)

    store.done(transition, "item-2")
    expect(store.isHappening(transition)).toBe(false)
    expect(store.getItems(transition).length).toBe(0)
  })

  it("should notify subscribers on state changes", async () => {
    const store = new TransitionsStore()
    const transition = ["fetch-data"]
    let notifyCount = 0

    store.subscribe(() => {
      notifyCount++
    })

    store.add(transition, { id: "item-1", when: Date.now() })
    // Wait for batched notify via setTimeout
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(notifyCount).toBeGreaterThan(0)

    const prevCount = notifyCount
    store.done(transition, "item-1")
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(notifyCount).toBeGreaterThan(prevCount)
  })

  it("should handle multiple transitions", () => {
    const store = new TransitionsStore()
    const transition1 = ["fetch-users"]
    const transition2 = ["fetch-posts"]

    store.add(transition1, { id: "item-1", when: Date.now() })
    store.add(transition2, { id: "item-2", when: Date.now() })

    expect(store.isHappening(transition1)).toBe(true)
    expect(store.isHappening(transition2)).toBe(true)

    store.done(transition1, "item-1")
    expect(store.isHappening(transition1)).toBe(false)
    expect(store.isHappening(transition2)).toBe(true)
  })

  it("should clear transition", () => {
    const store = new TransitionsStore()
    const transition = ["fetch-data"]

    store.add(transition, { id: "item-1", when: Date.now() })
    store.add(transition, { id: "item-2", when: Date.now() })

    store.clear(transition)
    expect(store.isHappening(transition)).toBe(false)
    expect(store.getItems(transition).length).toBe(0)
  })
})
