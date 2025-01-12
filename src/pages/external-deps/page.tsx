import { useEffect, useReducer, useState } from "react"
import { createStoreFactory } from "~/create-store"
import { DefaultActions } from "~/create-store/types"
import { createStoreUtils } from "~/createStoreUtils"
import { sleep } from "~/sleep"

type TodosState = {
  newTodoTitle: string
  currentTransition: null
}

type TodoExternalProps = {
  todos: Record<string, any>[]
}

type TodoActions = DefaultActions

const createTodosStore = createStoreFactory<TodosState, TodosState, TodoActions, TodoExternalProps>({
  async externalPropsFn() {
    await sleep(3000, "loading some external deps")
    // const response = await fetch("https://jsonplaceholder.typicode.com/todos/1")
    // const data = await response.json()
    return {
      todos: [],
    }
  },
  onConstruct({ externalProps, initialProps }) {
    return {
      ...initialProps,
      ...externalProps,
    }
  },
  reducer({ prevState, state, action }) {
    return state
  },
})

export function ExternalDepsPage() {
  const todosState = useState(() =>
    createTodosStore({
      newTodoTitle: "",
      currentTransition: null,
    })
  )
  const [todosStore] = todosState
  const [, rerender] = useReducer(s => s + 1, 0)
  useEffect(() => {
    Object.assign(window, { rerender })
  }, [])

  const Todos = createStoreUtils<typeof createTodosStore>(todosStore)

  // const isBootstraping = Todos.useTransition(["bootstrap"])

  useEffect(() => {
    Object.assign(window, { todosStore })
  }, [])

  return (
    <Todos.Provider value={todosState}>
      {/* {isBootstraping && <Spinner size={16} />} */}
      <Todos.Devtools />
    </Todos.Provider>
  )
}
