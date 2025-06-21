### v0.5.0
Changes in state triggered by transitions happen in background states, which aren't displayed on the screen until the transition finishes. However, you might want to display some values immediately to improve the user experience.

In v0.5.X, you can use the `optimistic` module from the reducer props to immediately set a state, which is temporarily and bound to the transition.

I introduced a new state called `optimisticState`, which uses the main `state` as its source and applies all optimistic updates from running transitions. Once a transition is completed, the optimistic updates tied to it are removed, and a new `optimisticState` is recalculated.

```jsx
// Store Definition
const store = newStoreDef({
  reducer({ prevState, state, action, optimistic, async, deps }) {
    optimistic(s => ({ likedPosts: [...s.likedPosts, action.postId] })) // <-
    async
      .promise(ctx => deps.likePost(action.postId, ctx.signal))
      .onSuccess((likedPosts, actor) => actor.set({ likedPosts }))
    return state
  }
})

// Component
function App({ post }) {
  // You can read from useCommittedSelector to read the valid state
  // Or you can read from the optimistic state using useSelector
  const isLiked = Posts.useSelector(s => s.likedPosts.includes(post.id))

  // ...
}
```

### v0.4.0
- pass a custom function to determine whether to push a new state to the history stack, clean the stack, prevent pushing altogether, or implement any other custom behavior

How it works:
```javascript
const store = newStoreDef({
  config: {
    onPushToHistory({ history, state, transition }) {
      return [...history, state] // <- default behavior
    }
  },
  reducer({ prevState, state, action, diff, set, async, events }) {
    ...
  }
})
```

Example:
- reset the history stack after each transition, otherwise, push the new state onto the history stack
```javascript
const store = newStoreDef({
  config: {
    onPushToHistory({ history, state, transition }) {
      if (!!transition) return [state]
      return [...history, state]
    }
  },
  reducer({ prevState, state, action, diff, set, async, events }) {
    ...
  }
})
```

---

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
