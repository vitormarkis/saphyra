import { CommentType } from "~/pages/external-deps/types"

export let FAKE_DB_VALUE: {
  likedPosts: number[] | undefined
  comments: Record<number, CommentType[]>
} = {
  likedPosts: undefined,
  comments: {
    2: [
      {
        authorId: 1,
        body: "I don't know what to say",
        id: "98h239n298j98",
        postId: 2,
      },
    ],
  },
}
