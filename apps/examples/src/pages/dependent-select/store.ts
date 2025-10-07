import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { PostType, TagType } from "./types"
import { settingsStore } from "./settings-store"

type DependentSelectState = {
  tags: TagType[]
  selectedTag: string
  $posts: PostType[]
}

type DependentSelectInitialProps = {}

type DependentSelectActions = {
  type: "change-tag"
  selectedTag: string
}

export type DependentSelectActionsDeps = {
  getPostsByTag: (tag: string, signal: AbortSignal) => Promise<PostType[]>
  getTags: (signal: AbortSignal) => Promise<TagType[]>
}

export const newDependentSelectStore = newStoreDef<
  DependentSelectInitialProps,
  DependentSelectState,
  DependentSelectActions,
  {},
  {},
  DependentSelectActionsDeps
>({
  async onConstruct({ deps, signal }) {
    const tags = await deps.getTags(signal)
    const [firstTag] = tags
    if (!firstTag) throw new Error("No tags found")
    return {
      tags,
      selectedTag: firstTag.slug,
    }
  },
  reducer({ state, action, set, diff, async, optimistic, deps }) {
    const settings = settingsStore.getState()

    if (action.type === "change-tag") {
      if (settings.optimistic) {
        optimistic({ selectedTag: action.selectedTag })
      }
      set({ selectedTag: action.selectedTag })
    }

    if (diff(["selectedTag"])) {
      async()
        .setName(`Getting posts [${state.selectedTag}]`)
        .promise(async ({ signal }) => {
          const posts = await deps.getPostsByTag(state.selectedTag, signal)
          set({ $posts: posts })
        })
    }

    return state
  },
})

export const DependentSelect =
  createStoreUtils<typeof newDependentSelectStore>()
