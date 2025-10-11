import React, { use, useEffect } from "react"
import { Suspense } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { toast } from "sonner"
import { cn } from "~/lib/cn"
import { extractErrorMessage } from "~/lib/extract-error-message"
import { range } from "~/lib/range"
import { groupByKey } from "~/lib/reduce-group-by"

type SuspenseTestState = {
  posts: Promise<Record<string, string>[]>
  $postsById: Promise<Record<string, Record<string, string>>>
  $postsIdList: Promise<string[]>
}

type SuspenseTestActions = {
  type: "revalidate"
}

const newPostsStore = newStoreDef<
  object,
  SuspenseTestState,
  SuspenseTestActions
>({
  onConstruct: () => ({ posts: fetchPosts() }),
  reducer({ state, action, set, diff }) {
    if (action.type === "revalidate") {
      set({ posts: fetchPosts() })
    }

    if (diff(["posts"])) {
      set({ $postsById: state.posts.then(posts => groupByKey(posts, "id")) })
      set({
        $postsIdList: state.posts.then(posts => posts.map(post => post.id)),
      })
    }

    return state
  },
})

const PostsStore = createStoreUtils<typeof newPostsStore>()

export function SuspenseTestPage() {
  const [store, resetStore, isLoading] = useNewStore(() => newPostsStore({}))

  useEffect(() => {
    Object.assign(window, {
      suspenseTest: store,
    })
  }, [store])

  PostsStore.useErrorHandlers(error => {
    toast.error(extractErrorMessage(error))
  }, store)

  return (
    <PostsStore.Context.Provider value={[store, resetStore, isLoading]}>
      <Suspense fallback={<Skeleton />}>
        <PostList />
      </Suspense>
    </PostsStore.Context.Provider>
  )
}

function PostList() {
  const postIdList = PostsStore.useSelector(s => use(s.$postsIdList))
  return (
    <ul className="flex flex-col gap-1">
      {postIdList.map(postId => (
        <Post
          key={postId}
          postId={postId}
        />
      ))}
    </ul>
  )
}

function Post({ postId }: { postId: string }) {
  const post = PostsStore.useSelector(s => use(s.$postsById)[postId])
  return <li className="p-2 rounded border">{post.title}</li>
}

async function fetchPosts(signal?: AbortSignal) {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    signal,
  })
  const posts = await response.json()
  return posts as Record<string, string>[]
}

function Skeleton() {
  const arr = Array.from({ length: 40 }).map(() => {
    let string = ""
    const rangex = range(14, 54)
    for (let i = 0; i < rangex; i++) {
      const chars = [".", "~", "*"]
      string += chars[Math.floor(Math.random() * chars.length)]
    }
    return string
  })
  return (
    <ul className="flex flex-col gap-1">
      {arr.map((value, index) => (
        <li
          key={index}
          className="p-2 rounded border animate-pulse"
        >
          <pre>{value}</pre>
        </li>
      ))}
    </ul>
  )
}
