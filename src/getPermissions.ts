import { PERMISSIONS } from "./consts"
import { sleep } from "./sleep"
import { SelectedRole } from "./types"

type GetPermissionsProps = {
  role: SelectedRole
}

export async function getPermissions({ role }: GetPermissionsProps) {
  await sleep(1000, "fetching permissions")
  const unlucky = Math.random() < 0.35
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
