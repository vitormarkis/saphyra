import { sleep } from "./sleep"

type FetchRoleProps = {
  roleName: string
}

export async function fetchRole({ roleName }: FetchRoleProps) {
  await sleep(3000, "fetching role")
  const unlucky = Math.random() < 0.1
  if (unlucky) {
    throw new Error("Error while fetching role!")
  }
  return roleName as "user" | "admin"
}
