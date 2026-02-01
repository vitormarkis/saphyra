import { describe, it, expect, vi } from "vitest"
import { AsyncRunner } from "../async-runner"
import { TransitionsStore } from "../../transitions"

describe("AsyncRunner", () => {
  it("should track async operations in transitions store", async () => {
    const transitionsStore = new TransitionsStore()
    const runner = new AsyncRunner(transitionsStore)
    const transition = ["fetch-data"]
    const controller = new AbortController()

    const promise = runner.run(transition, controller.signal, async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return "result"
    })

    expect(transitionsStore.isHappening(transition)).toBe(true)

    const result = await promise
    expect(result).toBe("result")
    expect(transitionsStore.isHappening(transition)).toBe(false)
  })

  it("should handle abort signal", async () => {
    const transitionsStore = new TransitionsStore()
    const runner = new AsyncRunner(transitionsStore)
    const transition = ["fetch-data"]
    const controller = new AbortController()

    const promise = runner.run(transition, controller.signal, async ({ signal }) => {
      await new Promise(resolve => setTimeout(resolve, 100))
      if (signal.aborted) {
        throw new Error("Aborted")
      }
      return "result"
    })

    controller.abort()

    await expect(promise).rejects.toThrow()
    expect(transitionsStore.isHappening(transition)).toBe(false)
  })

  it("should clean up on error", async () => {
    const transitionsStore = new TransitionsStore()
    const runner = new AsyncRunner(transitionsStore)
    const transition = ["fetch-data"]
    const controller = new AbortController()

    const promise = runner.run(transition, controller.signal, async () => {
      throw new Error("Test error")
    })

    await expect(promise).rejects.toThrow("Test error")
    expect(transitionsStore.isHappening(transition)).toBe(false)
  })
})
