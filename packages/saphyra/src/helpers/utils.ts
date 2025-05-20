import type { Setter, SetterOrPartialState } from "../types"
import { cloneObj } from "./obj-descriptors"

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

export function isAsyncFunction<Fn extends { constructor: { name: string } }>(
  fn: Fn
) {
  return fn.constructor.name === "AsyncFunction"
}

export const isSetter = <TState>(
  setterOrPartialState: SetterOrPartialState<TState>
): setterOrPartialState is Setter<TState> => {
  return typeof setterOrPartialState === "function"
}

export function newSetter<TState>(
  newPartialState: Partial<TState>
): Setter<TState> {
  return () => newPartialState
}

export function ensureSetter<TState>(
  setterOrPartialStateList: SetterOrPartialState<TState>
) {
  return isSetter(setterOrPartialStateList)
    ? setterOrPartialStateList
    : newSetter(setterOrPartialStateList)
}
