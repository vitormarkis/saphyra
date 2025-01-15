import { randomString } from "~/lib/utils"
import { sleep } from "~/sleep"

type CreateSessionProps = {}

export async function createSession({}: CreateSessionProps) {
  await sleep(1000, "creating session")
  return Array.from({ length: 7 }).reduce((acc, _, idx) => {
    if (idx % 3 === 0) acc += "."
    return acc + randomString()
  }, "ey" + randomString())
}
