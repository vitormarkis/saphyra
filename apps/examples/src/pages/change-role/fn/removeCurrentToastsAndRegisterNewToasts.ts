import { toast } from "sonner"
import { BeforeDispatchOptions } from "saphyra"

export function removeCurrentToastsAndRegisterNewToasts({
  action,
  meta,
  events,
}: BeforeDispatchOptions<any, any, any, any, any>) {
  meta.toasts_id_list ??= new Set()
  meta.toasts_id_list.forEach((id: string) => {
    toast.dismiss(id)
    meta.toasts_id_list.delete(id)
  })
  meta.toasts_id_list = new Set()

  events.once("got-role").run(() => {
    const id = toast.success("Role request was successful!")
    meta.toasts_id_list.add(id)
  })
  events.once("got-permissions").run(() => {
    const id = toast.success("Permissions request was successful!")
    meta.toasts_id_list.add(id)
  })

  return action
}
