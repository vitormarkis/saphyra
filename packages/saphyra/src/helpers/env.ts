export const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV !== "production"

export const isDebug =
  typeof process !== "undefined" && process.env.DEBUG === "true"
