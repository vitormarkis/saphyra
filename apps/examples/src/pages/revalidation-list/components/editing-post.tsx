import { Spinner } from "@blueprintjs/core"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { useCallbackOnKeyDown } from "~/hooks/use-callback-on-keydown"
import { cn } from "~/lib/cn"
import { getCommentsLazyOptions } from "~/pages/external-deps/lazy-values-options/get-comments-lazy-options"
import { Posts } from "~/pages/external-deps/store"
import {
  postsController,
  PostsController,
} from "~/pages/external-deps/store.controller"

type EditingPostProps = {}

export function EditingPost({}: EditingPostProps) {
  const [postsStore] = Posts.useStore()

  const commentingPostId = Posts.useSelector(s => s.commentingPostId)
  if (!commentingPostId) throw new Error("No commenting post id") // this will be solved with states in v2

  const post = Posts.useSelector(s => s.getPosts().byId[commentingPostId])

  /** [external-deps.react-query]
   * This useLazyValue is triggering a query run
   * for the comments of the post
   */
  const [comments, isLoadingComments] = Posts.useLazyValue({
    ...getCommentsLazyOptions({
      postId: post.id,
    }),
  })

  const isPlacingComment = Posts.useTransition(["place-comment", post.id])

  const [innerIsOpen, setInnerIsOpen] = useState(true)

  const closeModal = useCallback(() => {
    setInnerIsOpen(false)
  }, [setInnerIsOpen])

  const actuallyCloseModal = useCallback(() => {
    postsStore.setState({
      commentingPostId: null,
    })
  }, [postsStore])

  useCallbackOnKeyDown("Escape", closeModal)

  const revalidateCommentsOnSameTransition = PostsController.useSelector(
    s => s.revalidateCommentsOnSameTransition
  )

  return (
    <div
      data-state={innerIsOpen ? "open" : "closed"}
      className="inset-0 absolute data-[state=open]:backdrop-blur-sm z-10 p-4"
    >
      <div
        data-state={innerIsOpen ? "open" : "closed"}
        className={cn(
          "h-full rounded-md container-1 border p-6 flex flex-col gap-4",
          "data-[state=open]:duration-300 ease-[1,0,0.5,1]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-4",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-4 data-[state=closed]:fill-mode-forwards"
        )}
        onAnimationEnd={() => {
          if (innerIsOpen) return
          actuallyCloseModal()
        }}
      >
        <div className="flex">
          <label
            htmlFor=""
            className="flex items-center gap-1 px-2"
          >
            <input
              type="checkbox"
              checked={revalidateCommentsOnSameTransition}
              onChange={e => {
                postsController.setState({
                  revalidateCommentsOnSameTransition: e.target.checked,
                })
              }}
              className="h-4 w-4 rounded-sm"
            />
            <span className="text-xs text-center bg-gray-700 text-gray-200 px-2 py-1 rounded-sm">
              Revalidate comments on same transition
            </span>
          </label>
        </div>
        <div className=" shrink-0">
          <h2 className="font-bold dark:text-white">{post.title}</h2>
          <p className="dark:text-gray-400">{post.body}</p>
        </div>

        <div className="shrink-[999] basis-0  grow-[6] overflow-hidden flex flex-col">
          <h4 className="font-medium leading-8">Comments:</h4>
          <ul className="flex flex-col gap-2 overflow-auto min-h-0">
            {isLoadingComments ? (
              <Spinner />
            ) : (
              comments.map(comment => (
                <li
                  key={comment.id}
                  className="text-sm/none px-3 py-2 rounded bg-gray-200 dark:bg-gray-900 dark:text-gray-300"
                >
                  <strong className="dark:text-white font-semibold">
                    {comment.authorId}:{" "}
                  </strong>
                  {comment.body}
                </li>
              ))
            )}
          </ul>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const formData = new FormData(form)
            let comment = formData.get("comment") as string
            comment = comment.trim()
            if (comment.length === 0) return
            postsStore.dispatch({
              type: "place-comment",
              postId: commentingPostId,
              comment,
              revalidateOnSameTransition: revalidateCommentsOnSameTransition,
              transition: ["place-comment", commentingPostId],
              onTransitionEnd: () => {
                form.reset()
                const firstElement = form.elements[0] as HTMLElement
                firstElement.focus()

                toast.success("Comment posted!")
                // closeModal()
              },
            })
          }}
          className="flex flex-col gap-4 grow-[1] shrink-0 "
        >
          <label
            className="font-medium leading-8 flex-1 flex flex-col"
            htmlFor="comment"
          >
            <span>Leave a comment:</span>
            <textarea
              autoFocus
              id="comment"
              rows={1}
              name="comment"
              aria-disabled={isPlacingComment}
              className="aria-disabled:opacity-50 w-full flex-1 rounded-md border p-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white font-normal"
              placeholder="Write your comment here..."
            />
          </label>

          <div className="flex justify-between">
            <button onClick={() => closeModal()}>Cancel</button>
            <button
              disabled={isPlacingComment}
              type="submit"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
