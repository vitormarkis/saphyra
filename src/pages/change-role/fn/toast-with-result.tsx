import { toast } from "sonner"
import { OnTransitionEndProps } from "~/create-store/types"
import { fromErrorToMessage } from "~/fromErrorToMessage"

export function toastWithResult({
  error,
  events,
  meta,
}: OnTransitionEndProps<any, any>) {
  if (error) {
    events.clear("got-role")
    events.clear("got-permissions")
    const id = toast.error(
      `[Transaction] Changes we're not applied! Reason: ${fromErrorToMessage(error)}`
    )
    meta.toasts_id_list.add(id)
    return
  }

  const id = toast.success(
    <p className="">
      <strong>[Transaction]</strong> Change role transaction was successful!
    </p>
  )
  meta.toasts_id_list ??= new Set()
  meta.toasts_id_list.add(id)
}
