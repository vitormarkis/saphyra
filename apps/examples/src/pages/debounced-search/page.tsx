import { cn } from "~/lib/cn"
import { toast } from "sonner"
import { newStoreDef } from "saphyra"
import { CenteredSpinner } from "~/components/CenteredSpinner"
import { extractErrorMessage } from "~/lib/extract-error-message"
import { CenteredErrorUnknown } from "~/components/CenteredError"
import { useCallback, useState, useEffect } from "react"
import { createStoreUtils, useBootstrapError, useNewStore } from "saphyra/react"
import { queryClient } from "~/query-client"
import { Waterfall } from "~/devtools/waterfall"

type DebouncedSearchEvents = {}

type DebouncedSearchActions = {
  $updatesCount?: "multiple" | "few" | "one"
} & {
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
  config: {
    runOptimisticUpdateOn({ action }) {
      if (action.$updatesCount === "multiple") return false
      return true
    },
  },
  onConstruct({ initialProps }) {
    return {
      name: initialProps.initialName ?? "",
    }
  },
  reducer({ prevState, state, action, set, async, diff, optimistic, store }) {
    if (action.type === "change-name") {
      optimistic({ name: action.name })
      set({ name: action.name })
    }

    if (diff(["name"])) {
      const cachedUsers = queryClient.getQueryData<any[]>(
        getUserListQueryOptions({ name: state.name }).queryKey
      )

      if (cachedUsers) {
        set({ $users: cachedUsers })
      } else {
        async()
          .setName(`q: [${action.name}]`)
          .promise(async ({ signal }) => {
            const users = await listUsers(state.name, signal)
            set({ $users: users })
          })
      }
    }

    return state
  },
})

const DebouncedSearch = createStoreUtils<typeof newDebouncedSearch>()

export function DebouncedSearchPage() {
  const instantiateStore = useCallback(() => newDebouncedSearch({}), [])

  const [debouncedSearchStore, resetStore, isLoading] =
    useNewStore(instantiateStore)

  const isBootstraping = DebouncedSearch.useTransition(
    ["bootstrap"],
    debouncedSearchStore
  )
  const [error, tryAgain] = useBootstrapError(
    [debouncedSearchStore, resetStore, isLoading],
    instantiateStore
  )

  if (isBootstraping) {
    return <CenteredSpinner />
  }

  if (error != null) {
    return <CenteredErrorUnknown error={error} />
  }

  return (
    <DebouncedSearch.Context.Provider
      value={[debouncedSearchStore, resetStore, isLoading]}
    >
      <DebouncedSearchView />
    </DebouncedSearch.Context.Provider>
  )
}

type DebouncedSearchViewProps = {}

export function DebouncedSearchView({}: DebouncedSearchViewProps) {
  const [debouncedSearch] = DebouncedSearch.useStore()

  useEffect(() => {
    Object.assign(window, { debouncedSearch })
  }, [debouncedSearch])

  const optimisticState = DebouncedSearch.useSelector()
  const query = DebouncedSearch.useSelector(s => s.name)

  DebouncedSearch.useErrorHandlers(error => {
    toast(extractErrorMessage(error))
  }, debouncedSearch)

  const isLoading = DebouncedSearch.useTransition(["debounced-search", "name"])

  const action = useCallback(
    (newQuery: string) => {
      debouncedSearch.dispatch({
        type: "change-name",
        name: newQuery,
        transition: ["debounced-search", "name"],
        beforeDispatch({ transition, createAsync, action, abort, store }) {
          // abort(transition)
          // return action
          const async = createAsync()
          abort(transition)

          const cachedUsers = queryClient.getQueryData<any[]>(
            getUserListQueryOptions({ name: action.name }).queryKey
          )

          if (cachedUsers) {
            return action
          }

          async().timer(() => store.dispatch(action), 500, {
            label: `d [${action.name}]`,
          })
        },
      })
    },
    [debouncedSearch]
  )

  return (
    <div className="flex flex-col overflow-y-hidden p-1">
      {import.meta.env.DEV === true && (
        <button
          onClick={() => {
            function dispatchingThenCancelling() {
              action("e")
              setTimeout(() => {
                action("em")
              }, 520)
              setTimeout(() => {
                action("emily")
              }, 1040)
            }

            function cancellingBeforeRedispatch() {
              action("e")
              setTimeout(() => {
                action("em")
              }, 300)
              setTimeout(() => {
                action("emily")
              }, 600)
            }

            function abortTimerThenAbortRequest() {
              action("e")
              setTimeout(() => {
                action("em")
              }, 300)
              setTimeout(() => {
                action("emily")
              }, 820)
            }
            function abortRequestThenAbortTimer() {
              action("e")
              setTimeout(() => {
                action("em")
              }, 520)
              setTimeout(() => {
                action("emily")
              }, 820)
            }
            function typingSlowly() {
              // action("e")
              // setTimeout(() => void action("em"), 200)
              // setTimeout(() => void action("em_"), 390)
              // setTimeout(() => void action("emi"), 550)
              // setTimeout(() => void action("emil"), 1200)
              // setTimeout(() => void action("emily"), 1500)
              action("e")
              setTimeout(() => void action("em"), 300)
              setTimeout(() => void action("emi"), 700)
              setTimeout(() => void action("emil"), 1200)
              setTimeout(() => void action("emily"), 1500)
            }
            // dispatchingThenCancelling()
            // cancellingBeforeRedispatch()
            // abortTimerThenAbortRequest()
            // abortRequestThenAbortTimer()
            typingSlowly()
          }}
        >
          Test
        </button>
      )}
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
          const value = e.target.value
          action(value)
        }}
      />
      <div className="py-2" />
      <div className="grid grid-rows-[1fr,1fr] gap-2 overflow-hidden h-full">
        <div
          className={cn(
            "relative flex flex-col gap-4 py-4 overflow-y-scroll basis-0 grow h-full p-2 rounded-md border",
            isLoading && "pointer-events-none"
          )}
        >
          {isLoading && <div className="absolute z-10 inset-0 bg-black/30" />}
          {optimisticState.$users.map(user => (
            <article
              key={user.id}
              className="flex gap-1"
            >
              <div className="min-h-fit">
                <div className="relative h-full aspect-square">
                  <img
                    src={user.image}
                    alt=""
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
              <div className="h-10 flex flex-col gap-0.5">
                <strong>
                  {user.firstName} {user.lastName}
                </strong>
                <span className="text-neutral-400">{user.email}</span>
              </div>
            </article>
          ))}
        </div>
        <div className="relative flex flex-col gap-4 py-4 overflow-y-scroll basis-0 grow h-full p-2 rounded-md border">
          <Waterfall
            store={debouncedSearch}
            extractErrorMessage={extractErrorMessage}
          />
        </div>
      </div>
    </div>
  )
}

async function listUsers(name: string, signal: AbortSignal) {
  return queryClient.ensureQueryData(getUserListQueryOptions({ name, signal }))
}

async function listUsersFn(name: string, signal?: AbortSignal) {
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

type GetUserListQueryOptions = {
  name: string
  signal?: AbortSignal
}

function getUserListQueryOptions({ name, signal }: GetUserListQueryOptions) {
  return {
    queryKey: ["users", name],
    queryFn: async () => {
      return listUsersFn(name, signal)
    },
  }
}
