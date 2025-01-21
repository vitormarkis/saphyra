export function isNewActionError(error: unknown) {
  return typeof error === "object" && error && "reason" in error && error.reason === "new-action"
}
