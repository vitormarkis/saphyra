import { createLuck } from "~/lib/create-luck"
import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type FetchPermissionsProps = {
  role: SelectedRole
  signal: AbortSignal
}

const { getLuck } = createLuck([1, 0, 1])

export async function fetchPermissions({
  role,
  signal,
}: FetchPermissionsProps) {
  await sleep(700, "fetching permissions", signal)
  if (getLuck()) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
