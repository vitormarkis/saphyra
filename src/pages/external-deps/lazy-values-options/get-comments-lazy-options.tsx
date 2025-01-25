import { fetchComments } from "~/pages/external-deps/fn/fetch-comments"
import { getCommentsQueryOptions } from "~/pages/external-deps/query-options/get-comments-query-options"
import { Posts } from "~/pages/external-deps/store"
import { queryClient } from "~/query-client"

type GetCommentsLazyOptionsProps = {
  postId: number
}

/** [external-deps.react-query]
 * Usually you would pass a onSuccess to sync the store with the just resolved value.
 * But notice that I'm not passing onSuccess here, it is because I registered a listener
 * on the store root that runs a setState updating the commentsByPostId
 * entry whenever this query receives a new value
 */
export function getCommentsLazyOptions({ postId }: GetCommentsLazyOptionsProps) {
  return Posts.createLazyOptions({
    select: s => s.commentsByPostId[postId],
    transition: ["comments", postId],
    transitionFn: ({ actor, signal, transition }) => {
      return queryClient.ensureQueryData({
        ...getCommentsQueryOptions({ postId }, { signal }),
      })
    },
  })
}
