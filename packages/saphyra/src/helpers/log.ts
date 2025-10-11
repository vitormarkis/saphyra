import { isDebug, isDev } from "./env"

export function $$onDevMode(fn: () => void) {
  if (isDev) fn()
}

export function $$onDebugMode(fn: () => void) {
  if (isDev && isDebug) fn()
}
