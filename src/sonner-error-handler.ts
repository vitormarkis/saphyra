import { toast } from "sonner"
import { StoreErrorHandler } from "./create-store/types"
import { fromErrorToMessage } from "./fromErrorToMessage"

export const toastWithSonner: StoreErrorHandler = error => {
  toast.error(fromErrorToMessage(error), {
    className: "bg-red-500 text-white",
  })
}
