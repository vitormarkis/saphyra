import { BeforeDispatch, GenericAction } from "~/create-store/types"

export function isNewActionError(error: unknown) {
  if (typeof error !== "object") return false
  if (!error) return false
  const _error = error as any
  if (_error.code === 20) return true
  if (_error.reason.code === 20) return true
  return false
}

export const createDefaultBeforeDispatch: <
  TBaseAction extends GenericAction = GenericAction
>() => BeforeDispatch<TBaseAction> = () => {
  return options => {
    return options.action
  }
}
