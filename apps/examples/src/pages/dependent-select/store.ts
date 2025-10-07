import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { PostType } from "./types"

type DependentSelectState = {
  tag: string
  $posts: PostType[]
}

type DependentSelectInitialProps = {
  tag: string
}

type DependentSelectActions = {
  type: "change-tag"
  tag: string
}

export type DependentSelectActionsDeps = {
  getPostsByTag: (tag: string, signal: AbortSignal) => Promise<PostType[]>
}

export const newDependentSelectStore = newStoreDef<
  DependentSelectInitialProps,
  DependentSelectState,
  DependentSelectActions,
  {},
  {},
  DependentSelectActionsDeps
>({
  reducer({ state, action, set, diff, async, optimistic, deps }) {
    if (action.type === "change-tag") {
      optimistic({ tag: action.tag })
      set({ tag: action.tag })
    }

    if (diff(["tag"])) {
      async().promise(async ({ signal }) => {
        const posts = await deps.getPostsByTag(state.tag, signal)
        set({ $posts: posts })
      })
    }

    return state
  },
})

export const DependentSelect =
  createStoreUtils<typeof newDependentSelectStore>()
