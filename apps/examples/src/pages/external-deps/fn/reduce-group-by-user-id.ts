import { PostType } from "~/pages/external-deps/types"

type Result = {
  byUserId: Record<string, PostType[]>
  byPostId: Record<string, PostType>
  idList: Set<number>
}

export function reduceGroupById() {
  return [
    (acc: Result, post: PostType) => {
      acc.byUserId[post.userId] ??= []
      acc.byUserId[post.userId].push(post)
      acc.byPostId[post.id] = post
      acc.idList.add(post.id)
      return acc
    },
    {
      idList: new Set(),
      byUserId: {},
      byPostId: {},
    } satisfies Result,
  ] as const
}
