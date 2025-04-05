import { cloneObj } from "saphyra"

export function capitalize(str?: string) {
  if (!str) return ""
  const words = str.split(" ")
  return words
    .map(word => {
      return word[0].toUpperCase() + word.substring(1)
    })
    .join(" ")
}

export function randomString() {
  return Math.random().toString(36).substring(2, 15)
}

export function handleExpandNode(
  setExpandedNodes: (
    setter: (expandedNodes: Set<string>) => Set<string>
  ) => void
) {
  return (nodeId: string) => {
    setExpandedNodes(expandedNodes => {
      const newExpandedNodes = new Set(expandedNodes)
      if (newExpandedNodes.has(nodeId)) {
        return new Set([...expandedNodes].filter(id => id !== nodeId))
      }
      return new Set([...expandedNodes, nodeId])
    })
  }
}

export function isAsyncFunction<Fn extends { constructor: { name: string } }>(
  fn: Fn
) {
  return fn.constructor.name === "AsyncFunction"
}

export function resolveSelectorPath(selectorFn: (state: any) => any): string[] {
  const paths: string[] = []

  const createProxy = () =>
    new Proxy(
      {},
      {
        get: (target, prop) => {
          if (typeof prop === "string") {
            paths.push(prop)
          }
          return createProxy()
        },
      }
    )

  selectorFn(createProxy())
  return paths
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export function createDebugableShallowCopy<T>(
  intendedState: T,
  debugProp?: keyof T
): T {
  const state = cloneObj(intendedState)

  if (debugProp) {
    let memory = state[debugProp]

    Object.defineProperty(state, debugProp, {
      get: () => memory,
      set: newValue => {
        state
        memory = newValue
      },
      enumerable: true,
      configurable: true,
    })
  }

  return state
}

export function noop(...args: any[]) {}
