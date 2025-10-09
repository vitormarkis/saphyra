import { sleep } from "~/sleep"
import { settingsStore } from "./settings-store"
import { DependentSelectActionsDeps } from "./store"
import { PostType, TagType } from "./types"
import { createLuck } from "~/lib/create-luck"

const getPostsByTagLuck = createLuck([1, 0])
const getTagsLuck = createLuck([1])

export const productionDeps: DependentSelectActionsDeps = {
  getPostsByTag: async (tag, signal) => {
    const settings = settingsStore.getState()
    const response = await fetch(`https://dummyjson.com/posts/tag/${tag}`, {
      signal,
    })
    if (settings.errorSometimes || settings.errorAlways) {
      await sleep(400)
      const should = settings.errorAlways || getPostsByTagLuck.getLuck()
      if (should) {
        throw new Error(`Error while getting posts by tag [${tag}]`)
      }
    }
    const data = await response.json()
    return data.posts as PostType[]
  },
  async getTags(signal) {
    const settings = settingsStore.getState()
    const response = await fetch("https://dummyjson.com/posts/tags", {
      signal,
    })
    if (settings.errorSometimes || settings.errorAlways) {
      await sleep(400)
      const should = settings.errorAlways || getTagsLuck.getLuck()
      if (should) {
        throw new Error("Error while getting tags")
      }
    }
    const data = await response.json()
    return data as TagType[]
  },
}
