import { queryOptions } from "@tanstack/react-query"
import { fetchComments } from "~/pages/external-deps/fn/fetch-comments"

type GetCommentsQueryOptionsProps = {
  postId: number
}

type QueryContext = {
  signal: AbortSignal
}

export function getCommentsQueryOptions(
  { postId }: GetCommentsQueryOptionsProps,
  ctx?: QueryContext
) {
  return queryOptions({
    queryKey: ["comments", postId] as const,
    queryFn: async ({ queryKey, signal }) => {
      const [, postId] = queryKey
      return await fetchComments({
        postId,
        signal: AbortSignal.any([...(ctx?.signal ? [ctx.signal] : []), signal]),
      })
    },
    meta: { postId },
  })
}
