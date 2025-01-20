import { PostType } from "~/pages/external-deps/types"

export async function fetchPosts() {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts")
  const posts = await response.json()
  return posts as PostType[]
}
