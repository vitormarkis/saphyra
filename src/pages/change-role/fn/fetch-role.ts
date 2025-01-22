import { sleep } from "../../../sleep"

type FetchRoleProps = {
  roleName: string
  signal: AbortSignal
}

export async function fetchRole({ roleName, signal }: FetchRoleProps) {
  await sleep(3000, "fetching role", signal)
  const unlucky = Math.random() < 0
  if (unlucky) {
    throw new Error("Error while fetching role!")
  }
  return roleName as "user" | "admin"
}
