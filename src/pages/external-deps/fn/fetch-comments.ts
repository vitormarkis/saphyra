import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

type FetchCommentsProps = {
  postId: number
}

export async function fetchComments({ postId }: FetchCommentsProps) {
  const value = FAKE_DB_VALUE.comments[postId] ?? []
  await sleep(700)
  return value
}
