import { createStoreFactory } from "../../create-store"
import { GithubProfile } from "./types"
import { createStoreUtils } from "../../createStoreUtils"

type UserStoreInitialProps = {
  username: string
  profile: GithubProfile | null
  currentTransition: null
}

async function fetchUser(username: string) {
  const response = await fetch("https://api.github.com/users/" + username)
  const profile: GithubProfile = await response.json()
  return profile
}

const createUserStore = createStoreFactory<UserStoreInitialProps>({
  reducer({ state, action, async }) {
    if (action.type === "fetch-user") {
      async.promise(fetchUser(state.username), profile => ({
        profile,
      }))
    }

    return state
  },
})

type GithubProfilePageProps = {}

const userStore = createUserStore({
  username: "",
  profile: null,
  currentTransition: null,
})

export const User = createStoreUtils<typeof createUserStore>(userStore)

export function GithubProfilePage({}: GithubProfilePageProps) {
  const username = User.useStore(s => s.username)
  const state = User.useStore(undefined)
  const isFetchingUser = User.useTransition(["user", "fetch"])

  return (
    <div className="flex flex-col p-4">
      <form
        action=""
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault()
          userStore.dispatch({ type: "fetch-user", transition: ["user", "fetch"] })
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
            userStore.setState({ username: e.target.value })
          }}
        />
        <button
          disabled={isFetchingUser}
          type="submit"
        >
          Fetch user
        </button>
        <pre>{JSON.stringify({ isFetchingUser }, null, 2)}</pre>
      </form>
      <strong className="font-bold">State</strong>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
