import { sleep } from "~/sleep"

let FAKE_DB_VALUE: number[]

export async function likePost(likedPosts: number[], postId: number) {
  FAKE_DB_VALUE ??= likedPosts
  await sleep(1200, `like-post [${postId}]`)
  if (FAKE_DB_VALUE.includes(postId)) {
    FAKE_DB_VALUE = FAKE_DB_VALUE.filter(id => id !== postId)
  } else {
    FAKE_DB_VALUE = [...FAKE_DB_VALUE, postId]
  }
  return FAKE_DB_VALUE
}
