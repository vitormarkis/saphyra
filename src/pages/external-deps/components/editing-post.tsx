import { useEffect } from "react"
import { Posts } from "~/pages/external-deps/store"

type EditingPostProps = {}

export function EditingPost({}: EditingPostProps) {
  const [postsStore] = Posts.useUseState()
  const commentingPostId = Posts.useStore(s => s.commentingPostId)
  if (!commentingPostId) throw new Error("No commenting post id")

  const post = Posts.useStore(s => s.$postsByPostId[commentingPostId])

  useEffect(() => {
    const handler = (e: { key: string }) => {
      if (e.key === "Escape") {
        postsStore.setState({ commentingPostId: null })
      }
    }

    document.addEventListener("keydown", handler)

    return () => {
      document.removeEventListener("keydown", handler)
    }
  }, [])

  return <pre>{JSON.stringify({ post }, null, 2)}</pre>
}
