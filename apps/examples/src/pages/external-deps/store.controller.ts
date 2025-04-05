import { createStoreUtils } from "@saphyra/react"
import { newStoreDef } from "saphyra"

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
