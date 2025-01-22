import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type FetchPermissionsProps = {
  role: SelectedRole
  signal: AbortSignal
}

export async function fetchPermissions({ role, signal }: FetchPermissionsProps) {
  await sleep(3000, "fetching permissions", signal)
  const unlucky = Math.random() < 0
  // const unlucky = true
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
