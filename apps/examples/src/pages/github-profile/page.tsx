import { createStoreUtils } from "saphyra/react"
import { newStoreDef } from "saphyra"
import { GithubProfile } from "./types"
import { Devtools } from "~/devtools/devtools"
import { Spinner } from "@blueprintjs/core"
import { cancelPrevious, debounce } from "~/saphyra/bd-presets"

type UserStoreInitialProps = {
  username: string
  $profile: GithubProfile | null
  currentTransition: null
}

async function fetchUser(username: string, signal: AbortSignal) {
  const response = await fetch("https://api.github.com/users/" + username)
  const profile: GithubProfile = await response.json()
  return profile
}

const newUserStore = newStoreDef<UserStoreInitialProps>({
  reducer({ state, action, async, set, optimistic }) {
    if (action.type === "update-user") {
      optimistic({ username: action.username })
      set({ username: action.username })
      async
        .promise(ctx => fetchUser(state.username, ctx.signal))
        .onSuccess((profile, actor) => {
          actor.set({ $profile: profile })
        })
    }

    return state
  },
})

const userStore = newUserStore({
  username: "",
  currentTransition: null,
})

export const User = createStoreUtils<typeof newUserStore>(userStore)

export function GithubProfilePage() {
  const username = User.useOptimisticStore(s => s.username)
  const isFetchingUser = User.useTransition(["user", "fetch"])

  return (
    <div className="flex flex-col p-4 overflow-hidden h-full">
      <label htmlFor="username">Username</label>
      <div className="flex gap-2 items-center">
        {/* {isFetchingUser && <Spinner size={24} />} */}
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          autoComplete="off"
          className="w-full"
          value={username}
          // disabled={isFetchingUser}
          onChange={e => {
            userStore.dispatch({
              type: "update-user",
              username: e.target.value,
              transition: ["user", "fetch"],
              beforeDispatch: cancelPrevious(),
            })
          }}
        />
        {isFetchingUser ? <Spinner size={24} /> : <div className="w-6 h-6" />}
      </div>

      <Devtools store={userStore} />
    </div>
  )
}
