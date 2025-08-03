### v0.7.4
- \[Internal\] Track how many sub transitions are happening via a list of `AsyncOperation` objects.
  - This is a way better way to handle subtransitions since it's easier to debug because you have detailed info of the subtransition that is happening, where it started, when it started and when it should end.
  - For you to `doneKey` now, you need to pass the same reference of the `AsyncOperation` object that you passed to `addKey`. Enforcing a clear relationship between the sideffect and it's clean up.
- Fixed a bug related to `prevState` and `newState` evaluation when running an async setState (e.g: inside a `async().promise`).
  - It was always re-running all the setters of that transition agains the current store.state, which caused new object/arrays references from these setters to be created everytime.

### v0.7.3
- Add `store.waitFor([todoId, "update"])` method that returns a promise that resolves when the transition is complete.
- Add `store.waitForBootstrap()` method that returns a promise that resolves when the store is ready to be used.
- Unify `dispatch` and `setState` in one common function called `dispatchImpl`.
- Prevent user to call `dispatch` or `setState` inside a `onConstruct` **synchronously**.
- Improve Saphyra internal error handling.
- Improve Saphyra logs based on environment variable.
- Enqueue async operations of the async module with a interface called `AsyncOperation`.
  - When invoking multiple async operations inside a reducer, they won't fire right away. They'll be saved to a list, that only runs if the reducer call don't error.
  - This list will be available somehow to the user track how many sideeffects are queued to run so they can debug stuff more easily.

### v0.7.2
- Add Cached Getters [see documentation](https://www.saphyra.dev/docs/features/cached-getters)
- Enqueue async operations from Async Module, made it easier to debug
- Logs conditionally based on Environment Variable
- Got tests working again
- Add husky
- Add Eslint
- Unified `setState` and `dispatch` in one common god function called `dispatchImpl`. A `setState` is an action with type `noop` + the setter
- Fix bugs related to reducer `dispatches` and `sets` with transitions

### v0.7.0
Renamed hooks and some other properties in the `createStoreUtils` function:
- `useOptimisticStore` -> `useSelector`
- `useStore` -> `useCommittedSelector`
- `useTransitionState` -> `useTransitionSelector`
- `useUseState` -> `useStore`

Reason: I wanted to make reading from the optimistic state the default behavior, instead of requiring developers to opt into it manually. Now, by default, you read from the optimistic state and manually opt into the committed state if needed.

I used the `Selector` suffix to align with common community conventions and improve cold onboarding.

Provided a `Context` instead of a `Provider`, so you can use the traditional `useContext` API to conditionally access the store, avoiding hacks with `useStore` and `try/catch` blocks.
```javascript
const [yourStore] = useContext(YourStore.Context) ?? []
if (!yourStore) return defaultValue
```


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
          async().promise(() =>
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
