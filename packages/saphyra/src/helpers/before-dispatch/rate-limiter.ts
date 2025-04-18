import type { BeforeDispatch, GenericAction } from "~/types"

export const rateLimiter = <TBaseAction extends GenericAction = GenericAction>(
  intervalMs = 500,
  attempts = 3
): BeforeDispatch<any, TBaseAction> => {
  return ({ action, meta }) => {
    const now = Date.now()
    meta.timestamps ??= []
    meta.timestamps = meta.timestamps.filter(
      (ts: number) => now - ts < intervalMs
    )
    if (meta.timestamps.length >= attempts) return
    meta.timestamps.push(now)
    return action
  }
}
