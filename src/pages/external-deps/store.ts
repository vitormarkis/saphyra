import { createStoreFactory } from "~/create-store"
import { createStoreUtils } from "~/createStoreUtils"
import { sleep } from "~/sleep"
import { fetchPosts } from "./fn/fetch-posts"
import { likePost } from "./fn/like-post"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { PostType } from "./types"

type PostsState = {
  newTodoTitle: string
  currentTransition: null
  likedPosts: number[]
  $postsByUserId: Record<string, PostType[]>
  $postsByPostId: Record<string, PostType>
  $postsId: number[]
}

type PostsExternalProps = {
  posts: PostType[]
}

type PostsActions = {
  type: "like-post"
  postId: number
}
const createPostsStore = createStoreFactory<PostsState, PostsState, PostsActions, PostsExternalProps>({
  async externalPropsFn() {
    const posts = await fetchPosts()
    await sleep(700)
    return {
      posts,
    }
  },
  onConstruct({ externalProps, initialProps }) {
    return {
      ...initialProps,
      ...externalProps,
    }
  },
  reducer({ prevState, state, action, set, diff, async }) {
    if (action.type === "like-post") {
      const likedPostsPromise = likePost(state.likedPosts, action.postId)
      async.promise(likedPostsPromise, (likedPosts, actor) => {
        actor.set(() => ({ likedPosts }))
      })
    }

    if (diff(["posts"])) {
      set(s => {
        const group = s.posts.reduce(...reduceGroupById())
        return {
          $postsByUserId: group.byUserId,
          $postsByPostId: group.byPostId,
          $postsId: [...group.idList],
        }
      })
    }

    return state
  },
})

export const Posts = createStoreUtils<typeof createPostsStore>()

export const postsStore = createPostsStore({
  newTodoTitle: "",
  currentTransition: null,
  likedPosts: [],
})
