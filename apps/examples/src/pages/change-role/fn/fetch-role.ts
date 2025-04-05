import { createLuck } from "~/lib/create-luck"
import { sleep } from "../../../sleep"

type FetchRoleProps = {
  roleName: string
  signal: AbortSignal
}

// const { getLuck } = createLuck([1])
const { getLuck } = createLuck([1, 0, 1, 1, 1])

export async function fetchRole({ roleName, signal }: FetchRoleProps) {
  await sleep(700, "fetching role", signal)
  if (getLuck()) {
    throw new Error("Error while fetching role! Try again.")
  }
  return roleName as "user" | "admin"
}
