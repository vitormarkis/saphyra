export function createDebugableShallowCopy<T>(intendedState: T, debugProp?: keyof T): T {
  const state = { ...intendedState }

  if (debugProp) {
    let memory = state[debugProp]

    Object.defineProperty(state, debugProp, {
      get: () => memory,
      set: newValue => {
        memory = newValue
      },
      enumerable: true,
      configurable: true,
    })
  }

  return state
}
