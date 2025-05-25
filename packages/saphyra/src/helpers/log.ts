const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"
const isDebug = typeof process !== "undefined" && process.env.DEBUG === "true"

export function log(...args: any[]) {
  if (isDev) console.log(...args)
}

export function logDebug(...args: any[]) {
  if (isDev || isDebug) console.debug(...args)
}
