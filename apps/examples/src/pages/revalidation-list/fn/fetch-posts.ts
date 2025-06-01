import { PostType } from "~/pages/external-deps/types"

export async function fetchPosts(signal: AbortSignal) {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    signal,
  })
  const posts = await response.json()
  if (signal.aborted) throw new Error("Aborted!")
  return posts as PostType[]
}
