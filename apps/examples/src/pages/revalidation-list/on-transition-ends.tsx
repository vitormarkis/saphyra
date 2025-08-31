import { OnTransitionEnd } from "saphyra"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import { extractErrorMessage } from "~/lib/extract-error-message"

export const toastWithRetry =
  (tryAgain: () => void): OnTransitionEnd<any, any, any, any, any> =>
  ({ error, transition, aborted, store }) => {
    if (aborted) return
    if (error) {
      const toastId = toast.error(extractErrorMessage(error), {
        action: (
          <Button
            onClick={() => {
              tryAgain()
              store.waitFor(transition).finally(() => toast.dismiss(toastId))
            }}
            className="bg-black text-white hover:bg-neutral-800 border-black hover:ring-black"
          >
            Try again
          </Button>
        ),
      })
    }
  }
