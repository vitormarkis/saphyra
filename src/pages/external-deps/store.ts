import { newStoreDef } from "~/create-store"
import { createStoreUtils } from "~/createStoreUtils"
import { fetchPosts } from "./fn/fetch-posts"
import { likePost } from "./fn/like-post"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { CommentType, PostType } from "./types"
import { fetchLikedPosts } from "~/pages/external-deps/fn/fetch-liked-posts"
import { placeComment } from "~/pages/external-deps/fn/fetch-place-commment"
import { randomString } from "~/lib/utils"
import { queryClient } from "~/query-client"
import { getCommentsQueryOptions } from "~/pages/external-deps/query-options/get-comments-query-options"

type PostsState = {
  newTodoTitle: string
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

export const newPostsStore = newStoreDef<PostsInitialProps, PostsState, PostsActions>({
  async onConstruct({ signal }) {
    const [posts, likedPosts] = await Promise.all([fetchPosts(signal), fetchLikedPosts(signal)])

    return {
      likedPosts,
      posts,
      commentingPostId: null,
      currentTransition: null,
      newTodoTitle: "",
      commentsByPostId: {},
    }
  },
  reducer({ prevState, state, action, set, diff, async, store }) {
    if (action.type === "place-comment") {
      const newComment: CommentType = {
        id: randomString(),
        authorId: 999,
        body: action.comment,
        postId: action.postId,
      }
      async
        .promise(ctx => placeComment(newComment, action.postId, ctx.signal))
        .onSuccess((_, actor) => {
          /** [external-deps.react-query]
           * Refetches the post comments after
           * a successful mutation
           */
          if (action.revalidateOnSameTransition) {
            actor.async.promise(() =>
              queryClient.refetchQueries({
                ...getCommentsQueryOptions({ postId: action.postId }),
              })
            )
          }
        })
    }

    if (action.type === "comment-in-post") {
      set({ commentingPostId: action.postId })
    }

    if (action.type === "like-post") {
      async
        .promise(ctx => likePost(state.likedPosts, action.postId, ctx.signal))
        .onSuccess((likedPosts, actor) => {
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

export const Posts = createStoreUtils<typeof newPostsStore>()
