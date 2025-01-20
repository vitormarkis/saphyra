import { queryOptions } from "@tanstack/react-query"
import { fetchComments } from "~/pages/external-deps/fn/fetch-comments"

type GetCommentsQueryOptionsProps = {
  postId: number
}

export function getCommentsQueryOptions({
  postId,
}: GetCommentsQueryOptionsProps) {
  return queryOptions({
    queryKey: ["comments", postId] as const,
    queryFn: async ({ queryKey }) => {
      const [, postId] = queryKey
      return await fetchComments({ postId })
    },
    meta: { postId },
  })
}
