/**
 * Delays execution for a specified number of milliseconds.
 * Can be optionally aborted using an AbortSignal.
 *
 * @param ms - The number of milliseconds to sleep.
 * @param context - Optional context identifier for logging purposes.
 * @param signal - Optional AbortSignal to cancel the sleep operation.
 * @returns A promise that resolves to `true` after the delay, or rejects if aborted.
 */
export function sleep(
  ms: number,
  context?: string,
  signal?: AbortSignal
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      // console.log("[SLEEP ABORTED]", context)
      return reject(new Error("Sleep aborted"))
    }

    // console.log("[SLEEPING]", context)

    const timeoutId = setTimeout(() => {
      // console.log("[WAKE]", context)
      cleanup()
      resolve(true)
    }, ms)

    const onAbort = (e: { target: EventTarget | null }) => {
      clearTimeout(timeoutId)
      // console.log("[SLEEP ABORTED]", context)
      cleanup()
      reject(e.target)
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort)
      }
    }

    if (signal) {
      signal.addEventListener("abort", onAbort)
    }
  })
}

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
