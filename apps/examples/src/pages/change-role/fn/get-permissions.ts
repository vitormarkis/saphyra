import { createLuck } from "~/lib/create-luck"
import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type FetchPermissionsProps = {
  role: SelectedRole
  signal: AbortSignal
}

// const { getLuck } = createLuck([1])
const { getLuck } = createLuck([1, 1, 1, 0, 1, 0])

export async function fetchPermissions({
  role,
  signal,
}: FetchPermissionsProps) {
  await sleep(700, "fetching permissions", signal)
  if (getLuck()) {
    throw new Error("Error while fetching permissions! Try again.")
  }
  return PERMISSIONS()[role]
}
