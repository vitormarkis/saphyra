import { FAKE_DB_VALUE } from "~/pages/external-deps/fn/fake_db"
import { sleep } from "~/sleep"

type FetchCommentsProps = {
  postId: number
  signal: AbortSignal
}

export async function fetchComments({ postId, signal }: FetchCommentsProps) {
  const value = FAKE_DB_VALUE.comments[postId] ?? []
  await sleep(700)
  if (signal.aborted) throw new Error("Aborted!")
  return value
}
