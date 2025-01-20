export function exact<const T = any>(result: T) {
  return result as Exact<T>
}

export function bad<const T>(error: T) {
  return [error] as [T]
}

export function nice<const T = undefined>(result?: T) {
  return [null, result] as [null, T]
}

export type Mutable<T> = T extends readonly [...infer A]
  ? { [K in keyof A]: A[K] }
  : T extends Record<string, any>
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T

export type Exact<T> = T extends readonly [...any[]] | Record<string, unknown>
  ? Mutable<T>
  : T

const watchValue = 20

const xx = exact([watchValue, false])
