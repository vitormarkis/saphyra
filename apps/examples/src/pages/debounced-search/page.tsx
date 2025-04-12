import { createStoreUtils, useBootstrapError } from "saphyra/react"
import { useCallback, useEffect, useState } from "react"
import { newStoreDef } from "saphyra"
import { CenteredSpinner } from "~/components/CenteredSpinner"
import { CenteredErrorUnknown } from "~/components/CenteredError"

type DebouncedSearchEvents = {}

type DebouncedSearchActions = {
  type: "change-name"
  name: string
}

type DebouncedSearchInitialProps = {
  initialName?: string
}

type DebouncedSearchState = {
  name: string
  $users: string[]
}

const newDebouncedSearch = newStoreDef<
  DebouncedSearchInitialProps,
  DebouncedSearchState,
  DebouncedSearchActions,
  DebouncedSearchEvents
>({
  onConstruct({ initialProps }) {
    return {
      name: initialProps.initialName ?? "",
    }
  },
  reducer({ prevState, state, action, set, async, diff }) {
    if (action.type === "change-name") {
      set({ name: action.name })
    }

    if (diff(["name"])) {
      async
        .promise(async ({ signal }) => {
          const users = await listUsers(state.name, signal)
          return users
        })
        .onSuccess((users, actor) => {
          actor.set({ $users: users })
        })
    }

    return state
  },
})

const DebouncedSearch = createStoreUtils<typeof newDebouncedSearch>()

export function DebouncedSearchPage() {
  const instantiateStore = useCallback(() => newDebouncedSearch({}), [])

  const [debouncedSearchStore, setDebouncedSearchStore] =
    useState(instantiateStore)

  const isBootstraping = DebouncedSearch.useTransition(
    ["bootstrap"],
    debouncedSearchStore
  )
  const [error, tryAgain] = useBootstrapError(
    [debouncedSearchStore, instantiateStore],
    instantiateStore
  )

  if (isBootstraping) {
    return <CenteredSpinner />
  }

  if (error != null) {
    return <CenteredErrorUnknown error={error} />
  }

  return (
    <DebouncedSearch.Provider
      value={[debouncedSearchStore, setDebouncedSearchStore]}
    >
      <DebouncedSearchView />
    </DebouncedSearch.Provider>
  )
}

type DebouncedSearchViewProps = {}

export function DebouncedSearchView({}: DebouncedSearchViewProps) {
  const [debouncedSearch] = DebouncedSearch.useUseState()

  useEffect(() => {
    Object.assign(window, { debouncedSearch })
  }, [debouncedSearch])

  const state = DebouncedSearch.useStore()

  useEffect(() => console.log({ state }), [state])
  console.log(state.$users.length)

  return (
    <div className="flex flex-col">
      <label
        htmlFor="name"
        className="leading-6"
      >
        Name
      </label>
      <input
        type="text"
        id="name"
        className="border"
        placeholder="John"
        value={state.name}
        onChange={e => {
          const name = e.target.value
          debouncedSearch.dispatch({
            type: "change-name",
            name,
            transition: ["debounced-search", "name"],
          })
        }}
      />
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}

async function listUsers(name: string, signal: AbortSignal) {
  const url = new URL("/users", "https://dummyjson.com")
  if (name !== "") {
    url.searchParams.append("search", name)
  }
  const response = await fetch(url, {
    signal,
  })

  if (!response.ok) throw new Error("Something went wrong!")
  const data = await response.json()
  return data.users
}
