import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { TodoType } from "./types"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { groupByKey } from "~/lib/reduce-group-by"
import { getTodosFromDb, toggleTodoInDb } from "./fn/fake-todos-db"

type RevalidationListState = {
  todos: TodoType[]
  $todosById: Record<number, TodoType>
}

type RevalidationListInitialProps = {}

type RevalidationListActions =
  | {
      type: "toggle-todo"
      todoId: number
    }
  | {
      type: "fetch-todos"
    }

export const newRevalidationListStore = newStoreDef<
  RevalidationListInitialProps,
  RevalidationListState,
  RevalidationListActions
>({
  async onConstruct({ signal }) {
    const todos = await getTodosFromDb(signal)
    return { todos }
  },
  reducer({
    prevState,
    state,
    action,
    set,
    diff,
    async,
    dispatch,
    deps,
    optimistic,
    store,
    // optimisticState,
  }) {
    if (action.type === "fetch-todos") {
      const meta = store.transitions.meta.get(action.transition)
      async.promise(
        async ctx => {
          const todos = await getTodosFromDb(ctx.signal)
          set({ todos })
          meta.revalidateTodos--
        },
        { label: "fetch" }
      )
    }

    if (action.type === "toggle-todo") {
      optimistic(s => ({
        todos: s.todos.map(todo =>
          todo.id === action.todoId
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      }))
      async.promise(
        async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
          console.log(
            JSON.parse(
              JSON.stringify(store.transitions.state.transitions, null, 2)
            )
          )
          const transitionString = action.transition?.join(":") ?? ""
          const subtransitionsCount =
            store.transitions.state.transitions[transitionString]
          debugger
          if (subtransitionsCount === 1) {
            dispatch({
              type: "fetch-todos",
            })
          }
        },
        { label: "toggle" }
      )
    }

    if (diff(["todos"])) {
      set(s => ({ $todosById: groupByKey(s.todos, "id") }))
    }

    return state
  },
})

export const RevalidationList =
  createStoreUtils<typeof newRevalidationListStore>()
