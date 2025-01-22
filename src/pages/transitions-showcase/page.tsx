import { useEffect, useRef, useState } from "react"
import { newStoreDef } from "~/create-store"
import { BaseState } from "~/create-store/types"
import { createStoreUtils } from "~/createStoreUtils"
import { useAbortController } from "~/hooks/use-abort-controller"
import { cn } from "~/lib/utils"
import { sleep } from "~/sleep"

type TransitionsStoreState = {
  count: number
  currentTransition: null
  albums: any[]
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

const newTransitionsStore = newStoreDef<{}, TransitionsStoreState, TransitionsStoreActions>({
  onConstruct: () => ({ count: 0, currentTransition: null, albums: [] }),
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
          const response = await fetch("https://jsonplaceholder.typicode.com/albums", {
            signal,
          })
          return await response.json()
        })
        .onSuccess((albums, actor) => {
          actor.set({ albums })
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

export function TransitionsShowcaseView({}: TransitionsShowcaseViewProps) {
  const [transitionsStore] = TransitionsStore.useUseState()

  const manyAbort = useAbortController()
  const isIncrementingMany = TransitionsStore.useTransition(["increment", "many"])

  const someAbort = useAbortController()
  const isIncrementingSome = TransitionsStore.useTransition(["increment", "some"])

  const fetchAlbumsAbort = useAbortController()
  const isLoadingAlbums = TransitionsStore.useTransition(["fetch", "albums"])
  const isFetchingSomething = TransitionsStore.useTransition(["fetch"])

  TransitionsStore.useErrorHandlers(error => {
    console.log("error", error)
  })

  const canRun = useRef(true)

  return (
    <div className="flex flex-wrap gap-2">
      <fieldset className="flex gap-2">
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
      </fieldset>
      <fieldset className="flex gap-2">
        <legend>Fetch albums (check network tab)</legend>
        <button
          onClick={() => {
            transitionsStore.dispatch({
              type: "fetch-albums",
              transition: ["fetch", "albums"],
              beforeDispatch(ctx) {
                if (ctx.meta.canRun === false) return
                ctx.meta.canRun = false
                setTimeout(() => {
                  ctx.meta.canRun = true
                }, 1000)

                if (ctx.currentTransition.isRunning) {
                  ctx.currentTransition.controller.abort()
                }

                return ctx.action
              },
            })
          }}
          className={cn(isLoadingAlbums && "border-red-800 ring-red-500 ring-2")}
        >
          Fetch
        </button>
        <button
          disabled={!isLoadingAlbums}
          onClick={() => {
            fetchAlbumsAbort.abort()
          }}
        >
          Cancel
        </button>
      </fieldset>
    </div>
  )
}
