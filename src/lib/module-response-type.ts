export function exact<const T = any>(result: T) {
  return result as Exact<T>
}

export function bad<const T>(error: T) {
  return [error] as [T]
}

export function nice<const T = undefined>(result?: T) {
  return [null, result] as [null, T]
}

export type Mutable<T> = T extends Record<string, any> ? { -readonly [K in keyof T]: Mutable<T[K]> } & unknown : T

export type Exact<T extends any> = T extends Record<string, unknown> ? Mutable<T> : T
