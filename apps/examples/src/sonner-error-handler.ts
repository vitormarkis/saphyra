import { toast } from "sonner"
import { fromErrorToMessage } from "./fromErrorToMessage"
import { StoreErrorHandler } from "saphyra"

export const toastWithSonner: StoreErrorHandler = error => {
  toast.error(fromErrorToMessage(error), {
    className: "bg-red-500 text-white",
  })
}
