import { BaseAction, BeforeDispatch, GenericAction } from "~/create-store/types"
import { EventsTuple } from "./event-emitter"

export function isNewActionError(error: unknown) {
  if (typeof error !== "object") return false
  if (!error) return false
  const _error = error as any
  if (_error.message === "Aborted!") return true
  if (_error.code === 20) return true
  if (_error.reason?.code === 20) return true
  return false
}

export const createDefaultBeforeDispatch =
  <TActions extends BaseAction<any> = GenericAction>(): BeforeDispatch<
    TActions,
    EventsTuple
  > =>
  options => {
    return options.action
  }
