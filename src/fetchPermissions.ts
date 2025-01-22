import { PERMISSIONS } from "./consts"
import { sleep } from "./sleep"
import { SelectedRole } from "./types"

type FetchPermissionsProps = {
  role: SelectedRole
}

export async function fetchPermissions({ role }: FetchPermissionsProps) {
  await sleep(3000, "fetching permissions")
  const unlucky = Math.random() < 0.1
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
