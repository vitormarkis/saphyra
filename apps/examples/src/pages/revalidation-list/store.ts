import { newStoreDef, runSuccessCallback } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { TodoType } from "./types"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { groupByKey } from "~/lib/reduce-group-by"
import { getTodosFromDb, toggleTodoInDb } from "./fn/fake-todos-db"
import { cancelPrevious } from "./before-dispatches"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"

type RevalidationListState = {
  todos: TodoType[]
  $todosById: Record<number, TodoType>
}

type RevalidationListInitialProps = {}

type RevalidationListActions = {
  type: "toggle-todo"
  todoId: number
  completed: boolean
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
    if (action.type === "toggle-todo") {
      async.promise(
        async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
        },
        {
          label: "toggle",
          onSuccess: {
            id: "fetch",
            fn: () => {
              async.promise(
                async ctx => {
                  const todos = await getTodosFromDb(ctx.signal)
                  set({ todos })
                },
                {
                  label: "fetch",
                }
              )
            },
          },
        }
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
