const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"
const isDebug = typeof process !== "undefined" && process.env.DEBUG === "true"

export function $$onDevMode(fn: () => void) {
  if (isDev) fn()
}

export function $$onDebugMode(fn: () => void) {
  if (isDev && isDebug) fn()
}
