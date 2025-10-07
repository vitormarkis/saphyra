import { DependentSelectActionsDeps } from "./store"

export const productionDeps: DependentSelectActionsDeps = {
  getPostsByTag: async (tag, signal) => {
    const response = await fetch(`https://dummyjson.com/posts/tag/${tag}`, {
      signal,
    })
    const data = await response.json()
    return data.posts
  },
}
