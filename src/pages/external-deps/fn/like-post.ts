import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

export async function likePost(likedPosts: number[], postId: number) {
  FAKE_DB_VALUE.likedPosts ??= likedPosts
  await sleep(1200, `like-post [${postId}]`)
  if (FAKE_DB_VALUE.likedPosts.includes(postId)) {
    FAKE_DB_VALUE.likedPosts = FAKE_DB_VALUE.likedPosts.filter(id => id !== postId)
  } else {
    FAKE_DB_VALUE.likedPosts = [...FAKE_DB_VALUE.likedPosts, postId]
  }
  return FAKE_DB_VALUE.likedPosts
}
