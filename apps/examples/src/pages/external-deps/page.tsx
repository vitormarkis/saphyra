import { Spinner } from "@blueprintjs/core"
import { useEffect, useState } from "react"
import { IconHeartFull } from "~/generic-structure-displayer/components/IconHearFull"
import { IconHeart } from "~/generic-structure-displayer/components/IconHeart"
import { cn } from "~/lib/cn"
import { newPostsStore, Posts } from "~/pages/external-deps/store"
import { PostType } from "./types"
import { PostsController } from "~/pages/external-deps/store.controller"
import { IconComment } from "~/generic-structure-displayer/components/IconComment"
import { EditingPost } from "~/pages/external-deps/components/editing-post"
import { notifyOnChangeList } from "~/notify-on-change"
import { getCommentsQueryOptions } from "~/pages/external-deps/query-options/get-comments-query-options"
import { Devtools } from "~/devtools/devtools"
import { toastWithSonner } from "~/sonner-error-handler"

import { fetchLikedPosts } from "./fn/fetch-liked-posts"
import { fetchPosts } from "./fn/fetch-posts"
import { placeComment } from "./fn/fetch-place-commment"
import { likePost } from "./fn/like-post"
import { useHistory, useNewStore } from "saphyra/react"
import { Waterfall } from "~/devtools/waterfall"
import { X } from "lucide-react"

export function ExternalDepsPage() {
  const [postsStore, resetStore, isLoading] = useNewStore(() =>
    newPostsStore(
      {},
      {
        deps: {
          fetchLikedPosts,
          fetchPosts,
          placeComment,
          likePost,
        },
      }
    )
  )

  const isBootstraping = Posts.useTransition(["bootstrap"], postsStore)
  const isCommentingPost = Posts.useCommittedSelector(
    s => s.commentingPostId != null,
    postsStore
  )
  const allPosts = Posts.useCommittedSelector(s => s.posts, postsStore)

  Posts.useErrorHandlers(toastWithSonner, postsStore)

  useEffect(() => {}, [])

  useHistory(postsStore)

  /** [external-deps.react-query]
   * Use React Query as truth source for post comments
   */
  useEffect(() => {
    if (isBootstraping) return

    return notifyOnChangeList(
      allPosts.map(post => ({
        ...getCommentsQueryOptions({
          postId: post.id,
        }),
        meta: { postId: post.id },
      })),
      (comments, meta) => {
        postsStore.setState({
          commentsByPostId: {
            ...postsStore.state.commentsByPostId,
            [meta.postId]: comments,
          },
        })
      }
    )
  }, [isBootstraping, allPosts, postsStore])

  useEffect(() => {
    Object.assign(window, { externalDeps: postsStore })
    return () => {
      Object.assign(window, {
        postsStore: undefined,
      })
    }
  }, [postsStore])

  return (
    <Posts.Context.Provider value={[postsStore, resetStore, isLoading]}>
      <div className="h-full gap-4 flex flex-col @xl:flex-row overflow-hidden">
        <div
          className={cn(
            "flex-1 flex justify-between min-h-0 min-w-0 h-full overflow-auto",
            isCommentingPost && "overflow-hidden"
          )}
        >
          {isBootstraping ? (
            <div className="w-full h-full grid place-items-center">
              <Spinner size={96} />
            </div>
          ) : (
            <div className="mr-4 relative w-full">
              <PostList />
            </div>
          )}
        </div>
        <div className="grid grid-rows-[1fr,1fr] min-h-0 min-w-0 w-1/2 h-full gap-4">
          <Devtools store={postsStore} />
          <Waterfall store={postsStore} />
        </div>
      </div>
    </Posts.Context.Provider>
  )
}

type PostListProps = {}

export function PostList({}: PostListProps) {
  const posts = Posts.useCommittedSelector(s => s.posts)
  const likedPostsAmount = Posts.useCommittedSelector(s => s.likedPosts.length)
  const isCommentingPost = Posts.useCommittedSelector(
    s => s.commentingPostId != null
  )
  // const isPending = Posts.useTransition(["post"])

  return (
    <div className="flex flex-col">
      {isCommentingPost && <EditingPost />}

      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <strong>Liked posts:</strong>
          <span>{likedPostsAmount}</span>
        </div>
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 ">
          {/* <label
            htmlFor=""
            className="flex flex-col items-center gap-1 px-2"
          >
            <span className="text-xs text-center">
              Batch
              <br />
              likes
            </span>
            <input
              type="checkbox"
              checked={PostsController.useCommittedSelector(
                s => s.batchLikes
              )}
              onChange={e => {
                postsController.setState({
                  batchLikes: e.target.checked,
                })
              }}
              className="h-4 w-4 rounded-sm"
            />
          </label> */}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {posts.map(post => (
          <Post
            key={post.id}
            post={post}
          />
        ))}
      </ul>
    </div>
  )
}

type PostProps = {
  post: PostType
}

export function Post({ post }: PostProps) {
  const [posts] = Posts.useStore()
  const isLiked = Posts.useSelector(s => s.likedPosts.includes(post.id))
  const isPostPending = Posts.useTransition(["post", post.id, "like"])

  return (
    <li
      className={cn(
        "flex flex-col whitespace-nowrap overflow-hidden group/wrapper p-2 relative cursor-default border rounded-md",
        "border-gray-200 bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-950",
        isLiked &&
          "ring-2 border-rose-300 ring-rose-50 dark:border-rose-400/40 dark:ring-rose-500/10"
        // isPostPending && "opacity-40"
      )}
    >
      <div
        className={cn(
          "flex absolute overflow-hidden top-0 right-0 rounded-bl-md opacity-0 group-hover/wrapper:opacity-100 transition-all ease-[0,1,0.5,1] duration-200 select-none"
        )}
      >
        <div
          role="button"
          onClick={() => {
            posts.dispatch({
              type: "comment-in-post",
              postId: post.id,
            })
          }}
          className={cn(
            "bg-gray-600 p-1 aspect-square group",
            "aria-busy:group-hover:bg-gray-300 dark:aria-busy:group-hover:bg-gray-900",
            "hover:bg-gray-200 bg-gray-100",
            "dark:hover:bg-gray-800 dark:bg-gray-900"
          )}
        >
          <IconComment
            // aria-busy={isLikingSomePost}
            className="dark:aria-busy:fill-rose-700/80 group-active:translate-y-0.5 w-4 h-4 fill-rose-600 dark:fill-rose-400"
          />{" "}
        </div>
        <div
          role="button"
          // aria-busy={isLikingSomePost}
          onClick={() => {
            const transition = ["post", post.id, "like"]

            posts.dispatch({
              type: "like-post",
              postId: post.id,
              transition,
              beforeDispatch({
                action,
                abort,
                transition,
                transitionStore,
                createAsync,
                store,
              }) {
                if (transitionStore.isHappeningUnique(transition)) {
                  abort(transition)
                  return
                }

                const async = createAsync()
                return async().timer(() => store.dispatch(action), 200, {
                  label: "debounce",
                })
              },
            })
          }}
          className={cn(
            "bg-gray-600 p-1 aspect-square group",
            "aria-busy:group-hover:bg-gray-300 dark:aria-busy:group-hover:bg-gray-900",
            "hover:bg-gray-200 bg-gray-100",
            "dark:hover:bg-gray-800 dark:bg-gray-900"
          )}
        >
          {isPostPending ? (
            <X className="dark:aria-busy:text-gray-500 group-active:translate-y-0.5 w-4 h-4" />
          ) : isLiked ? (
            <IconHeartFull
              // aria-busy={isLikingSomePost}
              className="dark:aria-busy:fill-rose-700/80 group-active:translate-y-0.5 w-4 h-4 fill-rose-600 dark:fill-rose-400"
            />
          ) : (
            <IconHeart
              // aria-busy={isLikingSomePost}
              className="dark:aria-busy:text-gray-500 group-active:translate-y-0.5 w-4 h-4"
            />
          )}
        </div>
      </div>

      <h3 className="font-bold">{post.title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-600">{post.body}</p>
    </li>
  )
}
