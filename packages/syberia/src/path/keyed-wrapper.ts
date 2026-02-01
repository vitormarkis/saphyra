import type { PathInstruction } from "./path-instruction"

export interface KeyedInfo {
  keyName: string
  keyValue: string | number
  parentPath: PathInstruction[]
}

/**
 * KeyedWrapper wraps an item from a collection with identity information.
 * 
 * Type-level: Intersects with `number` to be usable as an array index.
 * This is a compile-time brand - at runtime it's a Proxy over the original object.
 * 
 * Runtime: A Proxy that:
 * - Returns the wrapped item's properties normally
 * - Returns identity info via `__keyed`
 * - Returns a path token (e.g., "[id='p1']") via `Symbol.toPrimitive`
 */
export type KeyedWrapper<T> = T & {
  readonly __keyed: KeyedInfo
  readonly [Symbol.toPrimitive]: () => string
} & number // Brand as numeric to allow array indexing

export function createKeyedWrapper<T>(
  value: T,
  keyName: string,
  keyValue: string | number,
  parentPath: PathInstruction[] = []
): KeyedWrapper<T> {
  const token = `[${keyName}='${keyValue}']`

  return new Proxy(value as any, {
    get(target, prop) {
      if (prop === "__keyed") {
        return { keyName, keyValue, parentPath }
      }
      if (prop === Symbol.toPrimitive) {
        return () => token
      }
      return (target as any)[prop]
    },
    has(target, prop) {
      if (prop === "__keyed" || prop === Symbol.toPrimitive) {
        return true
      }
      return prop in target
    },
    ownKeys(target) {
      return [...Object.keys(target), "__keyed", Symbol.toPrimitive]
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === "__keyed") {
        return {
          enumerable: false,
          configurable: true,
          value: { keyName, keyValue, parentPath },
        }
      }
      if (prop === Symbol.toPrimitive) {
        return {
          enumerable: false,
          configurable: true,
          value: () => token,
        }
      }
      return Object.getOwnPropertyDescriptor(target, prop)
    },
  }) as KeyedWrapper<T>
}

export function isKeyedWrapper(value: any): value is KeyedWrapper<any> {
  return value && typeof value === "object" && "__keyed" in value
}
