import { useEffect, useState } from "react"
import { newStoreDef } from "~/create-store"
import { BaseState } from "~/create-store/types"
import { createStoreUtils } from "~/createStoreUtils"
import { useAbortController } from "~/hooks/use-abort-controller"
import { cn } from "~/lib/utils"
import { sleep } from "~/sleep"

type TransitionsStoreState = {
  count: number
}

type TransitionsStoreActions =
  | {
      type: "increment-many"
    }
  | {
      type: "increment-some"
    }

const newTransitionsStore = newStoreDef<{}, TransitionsStoreState, TransitionsStoreActions>({
  onConstruct: () => ({ count: 0 }),
  reducer({ prevState, state, action, async }) {
    if (action.type === "increment-many") {
      async.promise(sleep(1800, "many", action.signal), (_, actor) => {
        actor.set(s => ({ count: s.count + 10 }))
      })
    }

    if (action.type === "increment-some") {
      async.promise(sleep(900, "some", action.signal), (_, actor) => {
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

  return (
    <div className="flex flex-wrap gap-2">
      <fieldset className="flex gap-2">
        <legend>Increment many</legend>
        <button
          onClick={() => {
            transitionsStore.dispatch({
              type: "increment-many",
              transition: ["increment", "many"],
              signal: manyAbort.controller.signal,
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
              signal: someAbort.controller.signal,
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
    </div>
  )
}
