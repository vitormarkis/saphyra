import { CommentType, PostType } from "./types"

export type IExternalDepsDependencies = {
  fetchPosts: (signal: AbortSignal) => Promise<PostType[]>
  fetchLikedPosts: (signal: AbortSignal) => Promise<number[]>
  placeComment: (
    comment: CommentType,
    postId: number,
    signal: AbortSignal
  ) => Promise<any>
  likePost: (
    likedPosts: number[],
    postId: number,
    signal: AbortSignal
  ) => Promise<any>
}
