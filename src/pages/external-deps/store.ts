import { newStoreDef } from "~/create-store"
import { createStoreUtils } from "~/createStoreUtils"
import { fetchPosts } from "./fn/fetch-posts"
import { likePost } from "./fn/like-post"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { PostType } from "./types"
import { fetchLikedPosts } from "~/pages/external-deps/fn/fetch-liked-posts"

type PostsState = {
  newTodoTitle: string
  currentTransition: null
  $postsByUserId: Record<string, PostType[]>
  $postsByPostId: Record<string, PostType>
  $postsId: number[]

  commentingPostId: number | null

  posts: PostType[]
  likedPosts: number[]
}

type PostsInitialProps = {}

type PostsActions =
  | {
      type: "like-post"
      postId: number
    }
  | {
      type: "comment-in-post"
      postId: number
    }

const newPostsStore = newStoreDef<PostsInitialProps, PostsState, PostsActions>({
  async onConstruct() {
    const posts = await fetchPosts()
    const likedPosts = await fetchLikedPosts()

    return {
      likedPosts,
      posts,
      commentingPostId: null,
      currentTransition: null,
      newTodoTitle: "",
    }
  },
  reducer({ prevState, state, action, set, diff, async }) {
    if (action.type === "comment-in-post") {
      set(() => ({ commentingPostId: action.postId }))
    }

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

export const postsStore = newPostsStore({})

export const Posts = createStoreUtils(postsStore)
