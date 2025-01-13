import { createStoreFactory } from "~/create-store"
import { createStoreUtils } from "~/createStoreUtils"

type PostsControllerState = {
  batchLikes: boolean
}

export const createPostsController = createStoreFactory<PostsControllerState>()

export const postsController = createPostsController({
  batchLikes: false,
})

Object.assign(window, { postsController })

export const PostsController = createStoreUtils<typeof createPostsController>(postsController)
