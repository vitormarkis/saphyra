import { newStoreDef } from "~/create-store/store"
import { createStoreUtils } from "~/create-store/createStoreUtils"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { CommentType, PostType } from "./types"
import { randomString } from "~/lib/utils"
import { queryClient } from "~/query-client"
import { getCommentsQueryOptions } from "~/pages/external-deps/query-options/get-comments-query-options"
import { IExternalDepsDependencies } from "./IStore"

import { fetchLikedPosts } from "./fn/fetch-liked-posts"
import { fetchPosts } from "./fn/fetch-posts"
import { placeComment } from "./fn/fetch-place-commment"
import { likePost } from "./fn/like-post"

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
  deps: {
    fetchLikedPosts,
    fetchPosts,
    placeComment,
    likePost,
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
  reducer({ prevState, state, action, set, diff, async, deps }) {
    if (action.type === "place-comment") {
      const newComment: CommentType = {
        id: randomString(),
        authorId: 999,
        body: action.comment,
        postId: action.postId,
      }
      async
        .promise(ctx =>
          deps.placeComment(newComment, action.postId, ctx.signal)
        )
        .onSuccess((_, actor) => {
          /** [external-deps.react-query]
           * Refetches the post comments after
           * a successful mutation
           */
          const revalidate = () =>
            queryClient.refetchQueries({
              ...getCommentsQueryOptions({
                postId: action.postId,
              }),
            })

          if (action.revalidateOnSameTransition) {
            actor.async.promise(revalidate)
          } else {
            revalidate()
          }
        })
    }

    if (action.type === "comment-in-post") {
      set({ commentingPostId: action.postId })
    }

    if (action.type === "like-post") {
      async
        .promise(ctx =>
          deps.likePost(state.likedPosts, action.postId, ctx.signal)
        )
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
