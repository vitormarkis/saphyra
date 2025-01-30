export function fromErrorToMessage(error: unknown): string {
  if (!error) {
    return "Unknown error."
  }

  if (typeof error === "string") {
    return error
  }
  if (typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return error.message
    }
    if ("code" in error) {
      return String(error.code)
    }
  }

  return "Unknown error."
}
