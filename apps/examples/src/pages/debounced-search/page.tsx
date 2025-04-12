import { createStoreUtils, useBootstrapError } from "saphyra/react"
import { useCallback, useEffect, useState } from "react"
import { newStoreDef } from "saphyra"
import { CenteredSpinner } from "~/components/CenteredSpinner"
import { CenteredErrorUnknown } from "~/components/CenteredError"
import { cn } from "~/lib/cn"

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
  $users: Record<string, any>[]
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
  reducer({ prevState, state, action, set, async, diff, optimistic }) {
    if (action.type === "change-name") {
      optimistic({ name: action.name })
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
  const query = DebouncedSearch.useOptimisticStore(s => s.name)

  useEffect(() => console.log({ state }), [state])
  console.log(state.$users.length)

  const isLoading = DebouncedSearch.useTransition(["debounced-search", "name"])
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
        className="border"
        placeholder="John"
        value={query}
        onChange={e => {
          const name = e.target.value
          debouncedSearch.dispatch({
            type: "change-name",
            name,
            transition: ["debounced-search", "name"],
          })
        }}
      />
      <div
        className={cn(
          "relative flex flex-col gap-4 py-4",
          isLoading && "pointer-events-none"
        )}
      >
        {isLoading && <div className="absolute z-10 inset-0 bg-black/30" />}
        {state.$users.map(user => (
          <article className="flex gap-1">
            <div>
              <div className="relative h-full aspect-square">
                <img
                  src={user.image}
                  alt=""
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <span className="text-neutral-400">{user.email}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

async function listUsers(name: string, signal: AbortSignal) {
  const url = new URL("/users/search", "https://dummyjson.com")
  if (name !== "") {
    url.searchParams.append("q", name)
  }
  const response = await fetch(url, {
    signal,
  })

  if (!response.ok) throw new Error("Something went wrong!")
  const data = await response.json()
  return data.users
}
