### v0.3.2
- add ability do pass external dependencies
  - good for testing
  - keep the reducer pure
  - the deps are stored in the store instance, you can change it whenever you want

Example:
```javascript
export const newSocialMedia = newStoreDef({
  reducer({ state, action, async, deps }) {
    if (action.type === "place-comment") {
      const newComment = {
        id: randomString(),
        authorId: 999,
        body: action.comment,
        postId: action.postId,
      }
      
      // deps.placeComment below
      async
        .promise(ctx => deps.placeComment(newComment, action.postId, ctx.signal))
        .onSuccess(() => {
          async.promise(() =>
            queryClient.refetchQueries({
              ...getCommentsQueryOptions({
                postId: action.postId,
              }),
            })
          )
        })
    }

    return state
  },
})

function App() {
  const [socialMedia] = useState(() => newSocialMedia({
    posts: []
  }, {
    deps: {
      placeComment: async (comment, postId, signal) => {
        const response = await fetch(`/api/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify(comment),
          signal,
        })
        if (!response.ok) throw new Error("Failed to place comment")
        return await response.json()
      }
    }
  }))

  return <></>
}
```
