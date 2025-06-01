import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

export async function fetchLikedPosts(signal: AbortSignal) {
  const value = FAKE_DB_VALUE.likedPosts ?? []
  await sleep(700, undefined, signal)
  return value
}
