const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"
const isDebug = typeof process !== "undefined" && process.env.DEBUG === "true"

export function log(...args: any[]) {
  if (isDev) console.log(...args)
}

export function $$onDebugMode(fn: () => void) {
  if (isDev || isDebug) fn()
}
