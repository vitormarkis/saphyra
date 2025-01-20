import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { CommentType } from "~/pages/external-deps/types"
import { sleep } from "~/sleep"

export async function placeComment(comment: CommentType, postId: number) {
  await sleep(700)
  FAKE_DB_VALUE.comments[postId] ??= []
  FAKE_DB_VALUE.comments[postId] = [...FAKE_DB_VALUE.comments[postId], comment]
}
