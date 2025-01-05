import { sleep } from "./sleep"

type FetchRoleProps = {
  roleName: string
}

export async function fetchRole({ roleName }: FetchRoleProps) {
  await sleep(1000, "fetching role")
  const unlucky = Math.random() < 0.25
  if (unlucky) {
    throw new Error("Error while fetching role!")
  }
  return roleName as "user" | "admin"
}
