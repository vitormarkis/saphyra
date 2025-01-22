import { TransitionStartConfig } from "~/create-store/types"

export function isNewActionError(error: unknown) {
  return typeof error === "object" && error && "reason" in error && error.reason === null
}

export function defaultBeforeDispatch(config: TransitionStartConfig) {
  return config.action
}
