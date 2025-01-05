import { GithubProfile } from "./types"

async function fetchUser(username: string) {
  const response = await fetch("https://api.github.com/users/" + username)
  const profile: GithubProfile = await response.json()
  return profile
}

type GithubProfilePageProps = {}

export function GithubProfilePage({}: GithubProfilePageProps) {
  return (
    <div className="flex flex-col p-4">
      <form
        action=""
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault()
        }}
      >
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your username"
          autoComplete="off"
        />
        <button type="submit">Fetch user</button>
      </form>
      <strong className="font-bold">State</strong>
    </div>
  )
}
