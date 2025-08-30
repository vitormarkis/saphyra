import { useRef, useState } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { Button } from "~/components/ui/button"
import { sleep } from "~/sleep"

type TransitionsStoreState = {
  count: number
  currentTransition: null
  albums: any[]
  todos: any[]
}

type TransitionsStoreActions =
  | {
      type: "increment-many"
    }
  | {
      type: "increment-some"
    }
  | {
      type: "fetch-albums"
    }
  | {
      type: "fetch-todos"
    }

const newTransitionsStore = newStoreDef<
  {},
  TransitionsStoreState,
  TransitionsStoreActions
>({
  onConstruct: () => ({
    count: 0,
    currentTransition: null,
    albums: [],
    todos: [],
  }),
  reducer({
    prevState,
    state,
    action,
    async,
    diff,
    dispatch,
    events,
    set,
    store,
  }) {
    if (action.type === "increment-many") {
      async().promise(async ({ signal }) => {
        await sleep(2000, "many", signal)
        set(s => ({ count: s.count + 10 }))
      })
    }

    if (action.type === "fetch-albums") {
      async().promise(async ({ signal }) => {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/albums",
          {
            signal,
          }
        )
        const albums = await response.json()
        set({ albums })
      })
    }

    if (action.type === "fetch-todos") {
      async().promise(async ({ signal }) => {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/todos",
          {
            signal,
          }
        )
        const todos = await response.json()
        set({ todos })
      })
    }

    if (action.type === "increment-some") {
      async().promise(async ctx => {
        await sleep(900, "some", ctx.signal)
        set(s => ({ count: s.count + 4 }))
      })
    }

    return state
  },
})

const TransitionsStore = createStoreUtils<typeof newTransitionsStore>()

/**
 * React
 */
export function VideoPage() {
  const [transitionsStore, resetStore, isLoading] = useNewStore(() =>
    newTransitionsStore({})
  )

  return (
    <TransitionsStore.Context.Provider
      value={[transitionsStore, resetStore, isLoading]}
    >
      <TransitionsShowcaseView />
    </TransitionsStore.Context.Provider>
  )
}

type TransitionsShowcaseViewProps = {}

export function TransitionsShowcaseView({}: TransitionsShowcaseViewProps) {
  const [transitionsStore] = TransitionsStore.useStore()

  const isLoading = TransitionsStore.useTransition(["fetch"])

  TransitionsStore.useErrorHandlers(error => {
    console.log("error", error)
  })

  return (
    <div className="container-1 min-h-screen flex-wrap gap-2 grid place-items-center">
      <Button
        onClick={() => {
          transitionsStore.dispatch({
            type: "fetch-albums",
            transition: ["fetch", "albums"],
            beforeDispatch({ action, transitionStore, transition }) {
              if (transitionStore.isHappeningUnique(transition)) return
              return action
            },
          })
        }}
      >
        Fetch
      </Button>
      {/* <pre>{JSON.stringify({ isLoading: isLoading }, null, 2)}</pre> */}
    </div>
  )
}
