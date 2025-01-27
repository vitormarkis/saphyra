import { newStoreDef } from "~/create-store/store"
import { createStoreUtils } from "~/create-store/createStoreUtils"

type PostsControllerState = {
  batchLikes: boolean
  revalidateCommentsOnSameTransition: boolean
}

export const createPostsController = newStoreDef<PostsControllerState>()

export const postsController = createPostsController({
  batchLikes: false,
  revalidateCommentsOnSameTransition: false,
})

Object.assign(window, { postsController })

export const PostsController =
  createStoreUtils<typeof createPostsController>(postsController)
