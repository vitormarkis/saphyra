import { newStoreDef } from "../../create-store/store"
import { GithubProfile } from "./types"
import { createStoreUtils } from "../../create-store/createStoreUtils"
import { Devtools } from "~/devtools/devtools"

type UserStoreInitialProps = {
  username: string
  profile: GithubProfile | null
  currentTransition: null
}

async function fetchUser(username: string, signal: AbortSignal) {
  const response = await fetch("https://api.github.com/users/" + username)
  const profile: GithubProfile = await response.json()
  return profile
}

const newUserStore = newStoreDef<UserStoreInitialProps>({
  reducer({ state, action, async, set }) {
    if (action.type === "fetch-user") {
      async.promise(async ctx => {
        const profile = await fetchUser(state.username, ctx.signal)
        set({ profile })
      })
    }

    return state
  },
})

const userStore = newUserStore({
  username: "",
  profile: null,
  currentTransition: null,
})

export const User = createStoreUtils<typeof newUserStore>(userStore)

export function GithubProfilePage() {
  const username = User.useStore(s => s.username)
  const isFetchingUser = User.useTransition(["user", "fetch"])

  return (
    <div className="flex flex-col p-4 overflow-hidden h-full">
      <form
        action=""
        className="flex flex-col gap-2 h-full"
        onSubmit={e => {
          e.preventDefault()
          userStore.dispatch({
            type: "fetch-user",
            transition: ["user", "fetch"],
            beforeDispatch({ action, transitionStore, transition }) {
              if (transitionStore.isHappeningUnique(transition)) return
              return action
            },
          })
        }}
      >
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          autoComplete="off"
          value={username}
          disabled={isFetchingUser}
          onChange={e => {
            userStore.setState({
              username: e.target.value,
            })
          }}
        />
        <button
          disabled={isFetchingUser}
          type="submit"
        >
          Fetch user
        </button>
        <Devtools store={userStore} />
      </form>
    </div>
  )
}
