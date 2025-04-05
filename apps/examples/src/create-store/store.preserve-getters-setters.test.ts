import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { newStoreDef } from "./store"
import { SomeStore } from "./types"
import { sleep } from "~/sleep"

let store: SomeStore<{ count: 0; $stepsArr: number[] }, any, any, any, any>

describe("preserve descriptors", () => {
  beforeEach(() => {
    vi.useFakeTimers()

    store = newStoreDef<any>({
      reducer: ({ state, action, set, store, async }) => {
        if (action.type === "increment") {
          set(s => ({ count: s.count + 1 }))
        }
        if (action.type === "increment-async") {
          async
            .promise(ctx => sleep(1000, "sleep", ctx.signal))
            .onSuccess((_, actor) => actor.set(s => ({ count: s.count + 1 })))
        }

        if (action.type === "derive-steps-list") {
          set({
            get $stepsArr() {
              debugger
              store.uncontrolledState.stepsCalculationTimes ??= 0
              store.uncontrolledState.stepsCalculationTimes++
              return Array.from({ length: state.count }, (_, i) => i)
            },
          })
        }

        return state
      },
    })({ count: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test("no transition", () => {
    expect(store.getState()).toMatchObject({ count: 0 })
    store.dispatch({
      type: "increment",
    })

    expect(store.getState()).toMatchObject({ count: 1 })
    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    store.dispatch({
      type: "derive-steps-list",
    })

    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    const steps = store.getState().$stepsArr
    expect(steps).toEqual([0])
    expect(store.uncontrolledState.stepsCalculationTimes).toBe(1)
  })

  test("1s transition", async () => {
    expect(store.getState()).toMatchObject({ count: 0 })
    store.dispatch({
      type: "increment-async",
      transition: ["increment-1s"],
    })

    expect(store.getState()).toMatchObject({ count: 0 })
    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    await vi.advanceTimersByTimeAsync(500)
    expect(store.getState()).toMatchObject({ count: 0 })
    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    await vi.advanceTimersByTimeAsync(500)
    expect(store.getState()).toMatchObject({ count: 1 })
    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    store.dispatch({
      type: "derive-steps-list",
    })

    expect(store.uncontrolledState.stepsCalculationTimes).toBeUndefined()
    const steps = store.getState().$stepsArr
    expect(steps).toEqual([0])
    expect(store.uncontrolledState.stepsCalculationTimes).toBe(1)
  })
})
