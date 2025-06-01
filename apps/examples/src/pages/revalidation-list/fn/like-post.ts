import { createLuck } from "~/lib/create-luck"
import { range } from "~/lib/range"
import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

const { getLuck } = createLuck([1, 1, 0, 1, 0])

export async function likePost(
  likedPosts: number[],
  postId: number,
  signal: AbortSignal
) {
  if (signal.aborted) throw new Error("Aborted!")
  FAKE_DB_VALUE.likedPosts ??= likedPosts
  await sleep(range(600, 1500), `like-post [${postId}]`, signal)
  if (signal.aborted) throw new Error("Aborted!")
  if (getLuck()) {
    throw new Error("too busy")
  }
  if (FAKE_DB_VALUE.likedPosts.includes(postId)) {
    FAKE_DB_VALUE.likedPosts = FAKE_DB_VALUE.likedPosts.filter(
      id => id !== postId
    )
  } else {
    FAKE_DB_VALUE.likedPosts = [...FAKE_DB_VALUE.likedPosts, postId]
  }
  return FAKE_DB_VALUE.likedPosts
}
