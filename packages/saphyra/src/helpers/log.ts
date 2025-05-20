export function log(...args: any[]) {
  if (import.meta.env.MODE === "production") return
  return console.log(...args)
}

export function logDebug(...args: any[]) {
  if (import.meta.env.MODE !== "debug") return
  return console.log(...args)
}
