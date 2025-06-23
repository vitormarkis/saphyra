import { newStoreDef } from "../src/store"

// Simple state with cached getters
type State = {
  count: number
  getDoubledCount: () => number
  getSquaredCount: () => number
}

// Create store with derivations
const CounterStore = newStoreDef<State>({
  derivations: {
    getDoubledCount: {
      selectors: [s => s.count],
      evaluator: (count: number) => count * 2,
    },
    getSquaredCount: {
      selectors: [s => s.count],
      evaluator: (count: number) => count * count,
    },
  },
})

// Example usage
function example() {
  const store = CounterStore({ count: 5 })

  const state = store.getState()

  // Test cached getters
  console.log("Count:", state.count) // 5
  console.log("Doubled:", state.getDoubledCount()) // 10
  console.log("Squared:", state.getSquaredCount()) // 25

  // Test caching - should return same result without recalculating
  const result1 = state.getDoubledCount()
  const result2 = state.getDoubledCount()
  console.log("Cached results are equal:", result1 === result2) // true

  // Test that changing state updates cached getters
  store.setState({ count: 10 })

  const newState = store.getState()
  console.log("New count:", newState.count) // 10
  console.log("New doubled:", newState.getDoubledCount()) // 20
  console.log("New squared:", newState.getSquaredCount()) // 100
}

export { CounterStore, example }
