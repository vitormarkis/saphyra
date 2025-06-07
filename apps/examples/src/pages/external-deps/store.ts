import { newStoreDef } from "saphyra"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { CommentType, PostType } from "./types"
import { randomString } from "~/lib/utils"
import { queryClient } from "~/query-client"
import { getCommentsQueryOptions } from "~/pages/external-deps/query-options/get-comments-query-options"
import { IExternalDepsDependencies } from "./IStore"
import { createStoreUtils } from "saphyra/react"

type PostsState = {
  currentTransition: null
  $postsByUserId: Record<string, PostType[]>
  $postsByPostId: Record<string, PostType>
  $postsId: number[]

  commentingPostId: number | null

  posts: PostType[]
  likedPosts: number[]

  commentsByPostId: Record<number, CommentType[]>
  $commentsByAuthorId: Record<number, CommentType[]>
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
  | {
      type: "place-comment"
      postId: number
      comment: string
      revalidateOnSameTransition?: boolean
    }

export const newPostsStore = newStoreDef<
  PostsInitialProps,
  PostsState,
  PostsActions,
  {},
  {},
  IExternalDepsDependencies
>({
  config: {
    onPushToHistory({ history, state, transition }) {
      if (!!transition) return []
      return [...history, state]
    },
  },
  async onConstruct({ signal, deps }) {
    const [posts, likedPosts] = await Promise.all([
      deps.fetchPosts(signal),
      deps.fetchLikedPosts(signal),
    ])
    return {
      likedPosts,
      posts,
      commentingPostId: null,
      currentTransition: null,
      commentsByPostId: {},
    }
  },
  reducer({
    prevState,
    state,
    action,
    set,
    diff,
    async,
    deps,
    optimistic,
    store,
    // optimisticState,
  }) {
    if (action.type === "place-comment") {
      const newComment: CommentType = {
        id: randomString(),
        authorId: 999,
        body: action.comment,
        postId: action.postId,
      }
      async().promise(async ctx => {
        await deps.placeComment(newComment, action.postId, ctx.signal)

        /** [external-deps.react-query]
         * Refetches the post comments after
         * a successful mutation
         */
        await queryClient.refetchQueries({
          ...getCommentsQueryOptions({ postId: action.postId }),
        })
      })
    }

    if (action.type === "comment-in-post") {
      set({ commentingPostId: action.postId })
    }

    if (action.type === "like-post") {
      const isLiked = state.likedPosts.includes(action.postId)
      optimistic(state => {
        return {
          likedPosts: isLiked
            ? state.likedPosts.filter(id => id !== action.postId)
            : [...state.likedPosts, action.postId],
        }
      })
      async()
        .setName(["like-post", action.postId])
        .promise(async ctx => {
          const likedPosts = await deps.likePost(
            state.likedPosts,
            action.postId,
            ctx.signal
          )
          set({ likedPosts })
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

export const Posts = createStoreUtils<typeof newPostsStore>()
