import { cloneObj } from "saphyra"

export function createDebugableShallowCopy<T extends Record<string, any>>(
  intendedState: T,
  debugProp?: keyof T
): T {
  const state = cloneObj(intendedState)

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
