import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { PostType, TagType } from "./types"
import { settingsStore } from "./settings-store"
import invariant from "tiny-invariant"
import { noop } from "~/lib/utils"

type DependentSelectState = {
  tags: TagType[]
  selectedTag: string
  $posts: PostType[]
}

type DependentSelectInitialProps = {}

type DependentSelectActions =
  | {
      type: "change-tag"
      selectedTag: string
    }
  | {
      type: "fetch-posts"
      tag: string
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
  config: {
    onCommitTransition(props) {
      console.log("onCommitTransition", props)
    },
  },
  async onConstruct({ deps, signal }) {
    const tags = await deps.getTags(signal)
    const [firstTag] = tags
    if (!firstTag) throw new Error("No tags found")
    return {
      tags,
      selectedTag: firstTag.slug,
    }
  },
  reducer({ state, action, set, diff, async, optimistic, deps, dispatch }) {
    const settings = settingsStore.getState()

    if (action.type === "change-tag") {
      if (settings.optimistic) {
        optimistic({ selectedTag: action.selectedTag })
      }
      set({ selectedTag: action.selectedTag })
    }

    if (action.type === "fetch-posts") {
      async()
        .setName(`Getting posts [${state.selectedTag}]`)
        .promise(async ({ signal }) => {
          const posts = await deps.getPostsByTag(state.selectedTag, signal)
          set({ $posts: posts })
        })
    }

    if (diff(["selectedTag"])) {
      dispatch({
        type: "fetch-posts",
        tag: state.selectedTag,
      })
    }

    return state
  },
})

export const DependentSelect =
  createStoreUtils<typeof newDependentSelectStore>()
