import { useEffect, useState } from "react"
import { createStoreFactory } from "./create-store"
import { createStoreUtils } from "./createStoreUtils"
import { sleep } from "./sleep"

type TodosStoreInitialProps = {
  todos: Record<string, any>[]
  count: number
  $direction: "up" | "down"
}

// type TodosStoreActions = {
//   type: "add-todo"
//   title: string
// }

const TodosStore = createStoreFactory<TodosStoreInitialProps, TodosStoreInitialProps>({
  reducer({ action, prevState, state, store, async, set }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
      state
      function noop() {}
      noop()
    }
    if (action.type === "decrement") {
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-alot") {
      // async.promise(sleep(1000, "incrementing a lot"), s => ({
      //   count: s.count + 10,
      // }))
    }

    set(s => ({ $direction: prevState.count < s.count ? "up" : "down" }))

    return state
  },
})

export const Todos = createStoreUtils<typeof TodosStore>()

export default function App() {
  let [todosStore, setTodosStore] = useState(
    () => new TodosStore({ todos: [], count: 0, $direction: "down" })
  )

  useEffect(() => {
    Object.assign(window, { todosStore })
  }, [])

  const todosState = Todos.useStore(undefined, todosStore)

  useEffect(() => {
    console.log(todosStore)
  }, [todosStore])

  return (
    <div className="flex gap-4">
      <div className="flex flex-col">
        <button
          onClick={() => {
            todosStore.dispatch({ type: "increment" })
          }}
        >
          Increment
        </button>
        <button
          onClick={() => {
            todosStore.dispatch({ type: "increment-alot" })
          }}
        >
          Increment A Lot
        </button>
        <button
          onClick={() => {
            todosStore.dispatch({ type: "decrement" })
          }}
        >
          Decrement
        </button>
        <button
          onClick={() => {
            todosStore.render()
          }}
        >
          Commit
        </button>
      </div>
      <div className="flex">
        <pre>{JSON.stringify(todosState, null, 2)}</pre>
      </div>
      <div className="flex"></div>
    </div>
  )
}
