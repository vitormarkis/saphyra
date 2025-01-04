import { useEffect, useState, useSyncExternalStore } from "react"
import { createStoreFactory } from "./create-store"
import { createStoreUtils } from "./createStoreUtils"
import { sleep } from "./sleep"
import { cn } from "./lib/utils"

type TodosStoreInitialProps = {
  todos: Record<string, any>[]
  count: number
  $direction: "up" | "down"
  currentTransition: null
}

// type TodosStoreActions = {
//   type: "add-todo"
//   title: string
// }

const createTodosStore = createStoreFactory<TodosStoreInitialProps, TodosStoreInitialProps>({
  reducer({ prevState, state, action, async, set }) {
    if (action.type === "increment") {
      // state.count = state.count + 1
      set(s => ({ count: s.count + 1 }))
    }
    if (action.type === "decrement") {
      // state.count = state.count - 1
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-ten") {
      async.promise(sleep(3200, "incrementing a lot"), (_, s) => ({
        count: s.count + 10,
      }))
    }

    if (action.type === "increment-three") {
      async.promise(sleep(4000, "incrementing a bit"), (_, s) => ({
        count: s.count + 3,
      }))
    }

    if (state.count !== prevState.count) {
      // state.$direction = prevState.count <= state.count ? "up" : "down"
      set(s => ({ $direction: prevState.count <= s.count ? "up" : "down" }))
    }

    return state
  },
})

export const Todos = createStoreUtils<typeof createTodosStore>()

export default function App() {
  let [todosStore, setTodosStore] = useState(() =>
    createTodosStore({ todos: [], count: 0, $direction: "down", currentTransition: null })
  )

  useEffect(() => {
    Object.assign(window, { todosStore })
  }, [])

  const todosState = Todos.useStore(undefined, todosStore)
  const isTransitioning = Todos.useTransition(["increment"], todosStore)

  // const allTransitions = useSyncExternalStore(
  //   cb => todosStore.transitions.subscribe(cb),
  //   () => todosStore.transitions.state.transitions
  // )

  useEffect(() => {
    console.log(todosStore)
  }, [todosStore])

  return (
    <Todos.Provider value={[todosStore, setTodosStore]}>
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
            onClick={() => {
              todosStore.dispatch({ type: "increment-ten", transition: ["increment"] })
            }}
          >
            Increment (10)
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({ type: "increment-three", transition: ["increment"] })
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
          {/* <pre>{JSON.stringify({ allTransitions }, null, 2)}</pre> */}
          <pre>{JSON.stringify(todosState, null, 2)}</pre>
        </div>
        <div className="flex"></div>
      </div>
    </Todos.Provider>
  )
}
