import { randomString } from "~/lib/utils"
import { sleep } from "~/sleep"

export async function createSession(state: any, signal: AbortSignal): Promise<string> {
  await sleep(1000, "creating session")
  if (signal.aborted) throw new Error("Aborted!")
  return Array.from({ length: 7 }).reduce((acc: string, _, idx) => {
    if (idx % 3 === 0) acc += "."
    return acc + randomString()
  }, "ey" + randomString())
}
