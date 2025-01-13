import { Spinner } from "@blueprintjs/core"
import { useEffect } from "react"
import { IconHeartFull } from "~/generic-structure-displayer/components/IconHearFull"
import { IconHeart } from "~/generic-structure-displayer/components/IconHeart"
import { useHistory } from "~/hooks/use-history"
import { cn } from "~/lib/utils"
import { Posts, postsStore } from "~/pages/external-deps/store"
import { PostType } from "./types"
import { postsController, PostsController } from "~/pages/external-deps/store.controller"

export function ExternalDepsPage() {
  const isBootstraping = Posts.useTransition(["bootstrap"], postsStore)

  useHistory(postsStore)

  useEffect(() => {
    Object.assign(window, { postsStore })
    return () => {
      Object.assign(window, { postsStore: undefined })
    }
  }, [])

  return (
    <Posts.Provider value={[postsStore, () => {}]}>
      <div className="h-full gap-4 flex flex-col @xl:flex-row">
        <div className="flex-1 flex justify-between min-h-0 min-w-0 h-full overflow-auto">
          {isBootstraping ? (
            <div className="w-full h-full grid place-items-center">
              <Spinner size={96} />
            </div>
          ) : (
            <div className="mr-4">
              <PostList />
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 min-w-0 h-full overflow-auto">
          <Posts.Devtools />
        </div>
      </div>
    </Posts.Provider>
  )
}

type PostListProps = {}

export function PostList({}: PostListProps) {
  const posts = Posts.useStore(s => s.posts)
  const isPending = Posts.useTransition(["post"])

  return (
    <div className="flex flex-col ">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <strong>Loading</strong>
              <span>
                <Spinner size={16} />
              </span>
            </>
          )}
        </div>
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 ">
          <label
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
              checked={PostsController.useStore(s => s.batchLikes)}
              onChange={e => {
                postsController.setState({ batchLikes: e.target.checked })
              }}
              className="h-4 w-4 rounded-sm"
            />
          </label>
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
  const [posts] = Posts.useUseState()
  const isLiked = Posts.useStore(s => s.likedPosts.includes(post.id))
  // const isLikingSomePost = false
  const isLikingSomePost = Posts.useTransition(["post"])
  const batchLikes = PostsController.useStore(s => s.batchLikes)

  return (
    <li
      className={cn(
        "flex flex-col whitespace-nowrap overflow-hidden p-2 relative group cursor-default border rounded-md",
        "border-gray-200 bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-950",
        isLiked && "ring-2 border-rose-300 ring-rose-50 dark:border-rose-400/40 dark:ring-rose-500/10"
      )}
    >
      <div
        role="button"
        aria-busy={isLikingSomePost}
        onClick={() => {
          posts.dispatch({
            type: "like-post",
            postId: post.id,
            // @ts-ignore TODO
            transition: ["post", ...(batchLikes ? [] : [post.id]), "like"],
          })
        }}
        className={cn(
          "absolute top-0 right-0 rounded-bl-md p-1 opacity-0 group-hover:opacity-100 transition-all ease-[0,1,0.5,1] duration-200 select-none",
          "aria-busy:group-hover:bg-gray-300 dark:aria-busy:group-hover:bg-gray-900",
          "hover:bg-gray-200 bg-gray-100",
          "dark:hover:bg-gray-800 dark:bg-gray-900"
        )}
      >
        {isLiked ? (
          <IconHeartFull
            aria-busy={isLikingSomePost}
            className="dark:aria-busy:fill-rose-700/80 group-active:translate-y-0.5 w-4 h-4 fill-rose-600 dark:fill-rose-400"
          />
        ) : (
          <IconHeart
            aria-busy={isLikingSomePost}
            className="dark:aria-busy:text-gray-500 group-active:translate-y-0.5 w-4 h-4"
          />
        )}
      </div>
      <h3 className="font-bold">{post.title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-600">{post.body}</p>
    </li>
  )
}
