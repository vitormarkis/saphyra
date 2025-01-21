import { sleep } from "../../../sleep"

type FetchRoleProps = {
  roleName: string
  signal: AbortSignal
}

export async function fetchRole({ roleName, signal }: FetchRoleProps) {
  await sleep(1000, "fetching role", signal)
  const unlucky = Math.random() < 0.35
  if (unlucky) {
    throw new Error("Error while fetching role!")
  }
  return roleName as "user" | "admin"
}
