import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type FetchPermissionsProps = {
  role: SelectedRole
}

export async function fetchPermissions({ role }: FetchPermissionsProps) {
  await sleep(1000, "fetching permissions")
  const unlucky = Math.random() < 0.35
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
