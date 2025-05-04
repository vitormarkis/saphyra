import { EventsTuple } from "~/event-emitter"
import type { BeforeDispatch, ActionShape } from "~/types"

export const throttle = <
  TState extends Record<string, any> = any,
  TActions extends ActionShape<TState, TEvents> = ActionShape<any, any>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  intervalMs = 500
): BeforeDispatch<TState, TActions, TEvents, TUncontrolledState, TDeps> => {
  return ({ action, meta }) => {
    const now = Date.now()
    meta.timestamps ??= []
    meta.timestamps = meta.timestamps.filter(
      (ts: number) => now - ts < intervalMs
    )
    if (meta.timestamps.length >= 1) return
    meta.timestamps.push(now)
    return action
  }
}
