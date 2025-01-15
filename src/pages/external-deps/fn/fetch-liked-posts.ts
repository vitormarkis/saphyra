import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

export async function fetchLikedPosts() {
  await sleep(700)
  return FAKE_DB_VALUE.likedPosts ?? []
}
