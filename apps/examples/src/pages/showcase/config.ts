import { toast } from "sonner"
import { extractErrorMessage } from "~/lib/extract-error-message"

export const config = {
  errorHandlers: [(error: any) => toast.error(extractErrorMessage(error))],
}
