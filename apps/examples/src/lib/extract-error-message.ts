export const extractErrorMessage = (error: unknown) => {
  if (!error) {
    return "Unknown error."
  }
  if (typeof error === "string") {
    return error
  }
  if (typeof error === "object") {
    const err = error as { [key: string]: any }
    if (err.response?.data?.detail?.[0]?.msg) {
      return err.response.data.detail[0].msg
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message
    }
    if ("code" in error) {
      return String(error.code)
    }
  }
  return "Unknown error."
}
