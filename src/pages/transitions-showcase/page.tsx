import { useEffect, useRef, useState } from "react"
import { newStoreDef } from "~/create-store"
import { EventEmitter } from "~/create-store/event-emitter"
import { rateLimiter } from "~/create-store/helpers/before-dispatch/rate-limiter"
import { throttle } from "~/create-store/helpers/before-dispatch/throttle"
import { BaseState } from "~/create-store/types"
import { createStoreUtils } from "~/createStoreUtils"
import { useAbortController } from "~/hooks/use-abort-controller"
import { cn } from "~/lib/utils"
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

const newTransitionsStore = newStoreDef<{}, TransitionsStoreState, TransitionsStoreActions>({
  onConstruct: () => ({
    count: 0,
    currentTransition: null,
    albums: [],
    todos: [],
  }),
  reducer({ prevState, state, action, async, diff, dispatch, events, set, store }) {
    if (action.type === "increment-many") {
      async
        .promise(async ({ signal }) => {
          return await sleep(2000, "many", signal)
        })
        .onSuccess((_, actor) => {
          actor.set(s => ({ count: s.count + 10 }))
        })
    }

    if (action.type === "fetch-albums") {
      async
        .promise(async ({ signal }) => {
          await sleep(1800, "fetching albums", signal)
          // const response = await fetch("https://jsonplaceholder.typicode.com/albums", {
          //   signal,
          // })
          // return await response.json()
          return []
        })
        .onSuccess((albums, actor) => {
          actor.set({ albums })
        })
    }

    if (action.type === "fetch-todos") {
      async
        .promise(async ({ signal }) => {
          await sleep(1800, "fetching todos", signal)
          // const response = await fetch("https://jsonplaceholder.typicode.com/todos", {
          //   signal,
          // })
          // return await response.json()
          return []
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
export function TransitionsShowcasePage() {
  const transitionsStoreState = useState(() => newTransitionsStore({}))

  return (
    <TransitionsStore.Provider value={transitionsStoreState}>
      <div className="flex flex-col gap-4 h-full">
        <TransitionsShowcaseView />
        <TransitionsStore.Devtools />
      </div>
    </TransitionsStore.Provider>
  )
}

type TransitionsShowcaseViewProps = {}

type Events = {
  tick: []
}
export function TransitionsShowcaseView({}: TransitionsShowcaseViewProps) {
  const events = useRef(new EventEmitter<Events>())
  const [store] = TransitionsStore.useUseState()

  const isLoadingTodos = TransitionsStore.useTransition(["fetch", "todos"])
  const isLoadingAlbums = TransitionsStore.useTransition(["fetch", "albums"])

  TransitionsStore.useErrorHandlers(error => {
    console.log("error", error)
  })

  const canRun = useRef(true)

  useEffect(() => {
    const id = setInterval(() => {
      events.current.emit("tick")
      console.log("tick!")
    }, 3000)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-wrap gap-2">
      {/* <fieldset className="flex gap-2">
        <legend>Increment many</legend>
        <button
          onClick={() => {
            transitionsStore.dispatch({
              type: "increment-many",
              transition: ["increment", "many"],
            })
          }}
          className={cn(isIncrementingMany && "border-red-800 ring-red-500 ring-2")}
        >
          Many
        </button>
        <button
          disabled={!isIncrementingMany}
          onClick={() => {
            manyAbort.abort()
          }}
        >
          Cancel
        </button>
      </fieldset>
      <fieldset className="flex gap-2">
        <legend>Increment some</legend>
        <button
          onClick={() => {
            transitionsStore.dispatch({
              type: "increment-some",
              transition: ["increment", "some"],
              controller: new AbortController(),
            })
          }}
          className={cn(isIncrementingSome && "border-red-800 ring-red-500 ring-2")}
        >
          Some
        </button>
        <button
          disabled={!isIncrementingSome}
          onClick={() => {
            someAbort.abort()
          }}
        >
          Cancel
        </button>
      </fieldset> */}
      <fieldset className={cn("flex gap-2", isLoadingAlbums && "border-amber-600")}>
        <legend>Fetch albums (check network tab)</legend>
        <button
          onClick={() => {
            store.dispatch({
              type: "fetch-albums",
              transition: ["fetch", "albums"],
              beforeDispatch: ({ action, meta }) => {
                const now = Date.now()
                meta.timestamps ??= []
                meta.timestamps = meta.timestamps.filter((ts: number) => now - ts < 4000)
                if (meta.timestamps.length >= 0) return
                meta.timestamps.push(now)
                return action
              },
            })
          }}
          // className={cn(isLoadingTodos && "border-red-800 ring-red-500 ring-2")}
        >
          Fetch
        </button>
        <button
          // disabled={!isLoadingTodos}
          onClick={() => {
            // fetchAlbumsAbort.abort()
          }}
        >
          Cancel
        </button>
      </fieldset>
      <fieldset className={cn("flex gap-2", isLoadingTodos && "border-amber-600")}>
        <legend>Fetch todos (check network tab)</legend>
        <button
          onClick={() => {
            /**
             *
             */
            store.dispatch({
              type: "fetch-todos",
              transition: ["fetch", "todos"],
              beforeDispatch({ transitionStore, transition, action }) {
                // if (meta.canRun === false) return
                // meta.canRun = false
                // setTimeout(() => {
                //   meta.canRun = true
                // }, 1000)
                if (transitionStore.isHappeningUnique(transition)) {
                  const controller = transitionStore.controllers.get(transition)
                  controller.abort()
                }
                return action
              },
            })

            /**
             *
             */
          }}
          // className={cn(isLoadingTodos && "border-red-800 ring-red-500 ring-2")}
        >
          Fetch
        </button>
        <button
          // disabled={!isLoadingTodos}
          onClick={() => {
            // fetchTodosAbort.abort()
          }}
        >
          Cancel
        </button>
      </fieldset>
    </div>
  )
}
