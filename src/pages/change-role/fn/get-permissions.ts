import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type GetPermissionsProps = {
  role: SelectedRole
}

export async function getPermissions({ role }: GetPermissionsProps) {
  await sleep(1000, "fetching permissions")
  const unlucky = Math.random() < 0.25
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
