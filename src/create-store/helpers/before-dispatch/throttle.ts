import { BeforeDispatch, GenericAction } from "~/create-store/types"

export const throttle = <TBaseAction extends GenericAction = GenericAction>(
  intervalMs = 500
): BeforeDispatch<TBaseAction> => {
  return ({ action, meta }) => {
    const now = Date.now()
    meta.timestamps ??= []
    meta.timestamps = meta.timestamps.filter((ts: number) => now - ts < intervalMs)
    if (meta.timestamps.length >= 1) return
    meta.timestamps.push(now)
    return action
  }
}
