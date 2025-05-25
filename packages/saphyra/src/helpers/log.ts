export function log(...args: any[]) {
  if (process.env.NODE_ENV === "production") return
  return console.log(...args)
}

export function logDebug(...args: any[]) {
  if (process.env.DEBUG !== "true") return
  return console.log(...args)
}
