import { Spinner } from "@blueprintjs/core"
import { Fragment, useEffect, useState } from "react"
import { useHistory } from "~/hooks/use-history"
import { newStoreDef } from "./create-store"
import { BaseState } from "./create-store/types"
import { createStoreUtils } from "./createStoreUtils"
import { sleep } from "./sleep"

type CounterState = BaseState & {
  count: number
  $direction: "up" | "down"
}

type CounterActions =
  | {
      type: "increment"
    }
  | {
      type: "decrement"
    }
  | {
      type: "increment-ten"
    }
  | {
      type: "increment-three"
    }

const newCount = newStoreDef<CounterState, CounterState, CounterActions>({
  reducer({ prevState, state, action, async, set }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }
    if (action.type === "decrement") {
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-ten") {
      async
        .promise(ctx => sleep(3000, "incrementing a lot", ctx.signal))
        .onSuccess((_, actor) => {
          actor.set(s => ({
            count: s.count + 10,
          }))
        })
    }

    if (action.type === "increment-three") {
      async
        .promise(ctx => sleep(1800, "incrementing a little bit", ctx.signal))
        .onSuccess((_, actor) => {
          actor.set(s => ({ count: s.count + 3 }))
        })
    }

    if (state.count !== prevState.count) {
      set(s => ({
        $direction: prevState.count <= s.count ? "up" : "down",
      }))
    }

    return state
  },
})

export const Todos = createStoreUtils<typeof newCount>()

export default function App() {
  const countStoreState = useState(() =>
    newCount({
      count: 0,
      currentTransition: null,
    })
  )
  const [countStore] = countStoreState

  useHistory(countStore)

  useEffect(() => {
    Object.assign(window, {
      todosStore: countStore,
    })
  }, [])

  return (
    <Todos.Provider value={countStoreState}>
      <Content />
      <div className="mt-4">
        <Todos.Devtools />
      </div>
    </Todos.Provider>
  )
}

export function Content() {
  const [todosStore] = Todos.useUseState()
  const isTransitioning = Todos.useTransition(["increment"])

  return (
    <Fragment>
      <span className="bg-lime-50 dark:bg-lime-950 text-lime-800/80 border dark:border-lime-800 dark:text-lime-50 border-lime-300 rounded-sm px-2 py-1 text-xs/none h-fit mb-2 w-fit">
        Mess around and press CTRL Z and CTRL Y to undo and redo
      </span>
      <div className="flex gap-4">
        <div className="flex gap-2 @2xl:flex-row flex-col">
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "increment",
                transition: ["increment"],
              })
            }}
          >
            Increment
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "decrement",
              })
            }}
          >
            Decrement
          </button>
          <button
            onClick={async () => {
              const { count } = await new Promise<CounterState>(resolve => {
                todosStore.dispatch({
                  type: "increment-ten",
                  transition: ["increment", "ten"],
                  onTransitionEnd: resolve,
                })
              })
              console.log("new count", count)
            }}
          >
            Increment (10) [async]
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "increment-three",
                transition: ["increment", "three"],
              })
            }}
          >
            Increment (3) [async]
          </button>
        </div>
        <div className="flex">{isTransitioning && <Spinner size={14} />}</div>
      </div>
    </Fragment>
  )
}
