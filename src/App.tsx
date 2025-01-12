import { Fragment, useEffect, useState } from "react"
import { createStoreFactory } from "./create-store"
import { createStoreUtils } from "./createStoreUtils"
import { sleep } from "./sleep"
import { cn } from "./lib/utils"
import { BaseState } from "./create-store/types"
import { useHistory } from "~/hooks/use-history"

type TodosStoreInitialProps = BaseState & {
  count: number
  $direction: "up" | "down"
  currentTransition: null
}

const createTodosStore = createStoreFactory<TodosStoreInitialProps>({
  onConstruct({ initialProps, store }) {
    store.uncontrolledState = {}
    return initialProps
  },
  reducer({ prevState, state, action, async, set, store }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }
    if (action.type === "decrement") {
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-ten") {
      async.promise(sleep(3000), (_, actor) => {
        actor.set(s => ({ count: s.count + 10 }))
      })
    }

    if (action.type === "increment-three") {
      async.promise(sleep(1800), (_, actor) => {
        actor.set(s => ({ count: s.count + 3 }))
      })
    }

    if (state.count !== prevState.count) {
      set(s => ({ $direction: prevState.count <= s.count ? "up" : "down" }))
    }

    return state
  },
})

export const Todos = createStoreUtils<typeof createTodosStore>()

export default function App() {
  let [todosStore, setTodosStore] = useState(() =>
    createTodosStore({ count: 0, $direction: "down", currentTransition: null })
  )

  useHistory(todosStore)

  useEffect(() => {
    Object.assign(window, { todosStore })
  }, [])

  return (
    <Todos.Provider value={[todosStore, setTodosStore]}>
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
      <span className="bg-lime-50 text-lime-800/80 rounded-sm px-2 py-1 text-xs/none h-fit mb-2 w-fit">
        Mess around and press CTRL Z and CTRL Y to undo and redo 🥲
      </span>
      <div className="flex gap-4">
        <div className="flex flex-col">
          <button
            onClick={() => {
              todosStore.dispatch({ type: "increment", transition: ["increment"] })
            }}
          >
            Increment
          </button>
          <button
            onClick={async () => {
              const incrementTenResolver = Promise.withResolvers<TodosStoreInitialProps>()
              todosStore.dispatch({
                type: "increment-ten",
                transition: ["increment", "ten"],
                onTransitionEnd: incrementTenResolver.resolve,
              })
              const { count } = await incrementTenResolver.promise
              console.log("new count", count)
            }}
          >
            Increment (10)
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({ type: "increment-three", transition: ["increment", "three"] })
            }}
          >
            Increment (3)
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({ type: "decrement" })
            }}
          >
            Decrement
          </button>
        </div>
        <div className="flex">
          <div
            className={cn("size-10 ", {
              "bg-red-500": isTransitioning === true,
              "bg-emerald-500": isTransitioning === false,
            })}
          />
        </div>
      </div>
    </Fragment>
  )
}
