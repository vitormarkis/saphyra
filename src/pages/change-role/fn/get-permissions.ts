import { sleep } from "../../../sleep"
import { SelectedRole } from "../../../types"
import { PERMISSIONS } from "../const"

type FetchPermissionsProps = {
  role: SelectedRole
  abortController?: AbortController
}

export async function fetchPermissions({
  role,
  abortController,
}: FetchPermissionsProps) {
  await sleep(1000, "fetching permissions", abortController?.signal)
  const unlucky = Math.random() < 0.35
  // const unlucky = true
  if (unlucky) {
    throw new Error("Error while fetching permissions!")
  }
  return PERMISSIONS()[role]
}
