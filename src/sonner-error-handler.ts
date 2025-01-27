import { toast } from "sonner"
import { StoreErrorHandler } from "./create-store/types"

export const defaultErrorHandler: StoreErrorHandler = error => {
  function onError(error: string) {
    toast.error(error, {
      className: "bg-red-500 text-white",
    })
  }

  if (!error) {
    return onError("Unknown error.")
  }

  if (typeof error === "string") {
    return onError(error)
  }
  if (typeof error === "object") {
    if ("message" in error && typeof error.message === "string") {
      return onError(error.message)
    }
    if ("code" in error) {
      return onError(String(error.code))
    }
  }

  return onError("Unknown error.")
}
