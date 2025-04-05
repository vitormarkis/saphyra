import { useRef, useState } from "react"
import { newStoreDef } from "~/create-store/store"
import { createStoreUtils } from "~/create-store/createStoreUtils"
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
      async
        .promise(async ({ signal }) => {
          return await sleep(2000, "many", signal)
        })
        .onSuccess((_, actor) => {
          actor.set(s => ({
            count: s.count + 10,
          }))
        })
    }

    if (action.type === "fetch-albums") {
      async
        .promise(async ({ signal }) => {
          const response = await fetch(
            "https://jsonplaceholder.typicode.com/albums",
            {
              signal,
            }
          )
          return await response.json()
        })
        .onSuccess((albums, actor) => {
          actor.set({ albums })
        })
    }

    if (action.type === "fetch-todos") {
      async
        .promise(async ({ signal }) => {
          const response = await fetch(
            "https://jsonplaceholder.typicode.com/todos",
            {
              signal,
            }
          )
          return await response.json()
        })
        .onSuccess((todos, actor) => {
          actor.set({ todos })
        })
    }

    if (action.type === "increment-some") {
      async
        .promise(ctx => sleep(900, "some", ctx.signal))
        .onSuccess((_, actor) => {
          actor.set(s => ({ count: s.count + 4 }))
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
  const transitionsStoreState = useState(() => newTransitionsStore({}))

  return (
    <TransitionsStore.Provider value={transitionsStoreState}>
      <TransitionsShowcaseView />
    </TransitionsStore.Provider>
  )
}

type TransitionsShowcaseViewProps = {}

export function TransitionsShowcaseView({}: TransitionsShowcaseViewProps) {
  const [transitionsStore] = TransitionsStore.useUseState()

  const isLoading = TransitionsStore.useTransition(["fetch"])

  TransitionsStore.useErrorHandlers(error => {
    console.log("error", error)
  })

  return (
    <div className="container-1 min-h-screen flex-wrap gap-2 grid place-items-center">
      <button
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
      </button>
      {/* <pre>{JSON.stringify({ isLoading: isLoading }, null, 2)}</pre> */}
    </div>
  )
}
