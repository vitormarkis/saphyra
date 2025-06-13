import {
  AsyncPromiseOnFinishProps,
  BeforeDispatchOptions,
  Dispatch,
  EventsTuple,
  newStoreDef,
} from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { TodoType } from "./types"
import { groupByKey } from "~/lib/reduce-group-by"
import {
  getTodosFromDb,
  toggleTodoInDb,
  toggleTodoDisabledInDb,
} from "./fn/fake-todos-db"
import { toast } from "sonner"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { sleep } from "~/sleep"
import { noop } from "lodash"

type RevalidationListState = {
  todos: TodoType[]
  $todosById: Record<number, TodoType>
  $completedTodos: number[]
}

type RevalidationListInitialProps = {}

type RevalidationListActions =
  | {
      type: "toggle-todo"
      todoId: number
      completed: boolean
    }
  | {
      type: "toggle-disabled"
      todoId: number
      disabled: boolean
    }
  | {
      type: "revalidate-todos"
    }

async function revalidateTodoList(
  signal: AbortSignal,
  onNewTodos: (todos: TodoType[]) => void
) {
  const todos = await getTodosFromDb(signal)
  onNewTodos(todos)
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
    dispatchAsync,
    deps,
    optimistic,
    store,
    // optimisticState,
  }) {
    if (action.type === "revalidate-todos") {
      async()
        .setName("fetch na api")
        .promise(async ctx => {
          const todos = await getTodosFromDb(ctx.signal)
          set({ todos })
        })
    }

    if (action.type === "toggle-todo") {
      // const optimisticCompleted = !state.$completedTodos.includes(action.todoId)
      // optimistic(s => ({
      //   todos: s.todos.map(todo =>
      //     todo.id === action.todoId
      //       ? { ...todo, completed: optimisticCompleted }
      //       : todo
      //   ),
      // }))

      async()
        .setName("complete")
        .onFinish(revalidateList(dispatch))
        .promise(async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
          // const todos = await getTodosFromDb(ctx.signal)
          // set({ todos })
          // await dispatchAsync(
          //   {
          //     type: "revalidate-todos",
          //     transition: ["revalidate-todo-list"],
          //     beforeDispatch: cancelPrevious,
          //   },
          //   ctx.signal
          // )
        })
    }

    if (action.type === "toggle-disabled") {
      // const optimisticDisabled = !state.todos.find(
      //   todo => todo.id === action.todoId
      // )?.disabled

      // optimistic(s => ({
      //   todos: s.todos.map(todo =>
      //     todo.id === action.todoId
      //       ? { ...todo, disabled: optimisticDisabled }
      //       : todo
      //   ),
      // }))
      async()
        .setName("disabled")
        .onFinish(revalidateList(dispatch))
        .promise(async ctx => {
          await toggleTodoDisabledInDb(action.todoId, ctx.signal)
          // const todos = await getTodosFromDb(ctx.signal)
          // set({ todos })
          // await dispatchAsync(
          //   {
          //     type: "revalidate-todos",
          //     transition: ["revalidate-todo-list"],
          //     beforeDispatch: cancelPrevious,
          //   },
          //   ctx.signal
          // )
        })
    }

    if (diff(["todos"])) {
      set(s => ({ $todosById: groupByKey(s.todos, "id") }))
    }

    if (diff(["todos"])) {
      set(s => ({
        $completedTodos: s.todos
          .filter(todo => todo.completed)
          .map(todo => todo.id),
      }))
    }

    return state
  },
})

function revalidateList(
  dispatch: Dispatch<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple
  >
): AsyncPromiseOnFinishProps {
  return {
    id: ["revalidating"],
    fn: (isLast, resolve, reject) => {
      return dispatch({
        type: "revalidate-todos",
        transition: ["revalidate-todo-list"],
        beforeDispatch: ({ action }) => {
          if (!isLast()) return
          return action
        },
        onTransitionEnd: ({ aborted, error }) => {
          if (aborted) return
          if (error) {
            return reject(error)
          }
          return resolve(true)
        },
      })
    },
  }
}

export const RevalidationList =
  createStoreUtils<typeof newRevalidationListStore>()

function cancelPrevious({
  store,
  abort,
  transition,
  action,
  createAsync,
}: BeforeDispatchOptions<any, any, any, any, any>) {
  const async = createAsync()
  abort(transition)
  async()
    .setName("d")
    .timer(() => {
      store.dispatch(action)
    }, 400)
}
