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
import { noop } from "~/lib/utils"

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
  config: {
    onCommitTransition(props) {
      noop()
    },
  },
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
      const todoIndex = state.todos.findIndex(todo => todo.id === action.todoId)
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
        .onFinish(revalidateList(dispatch, todoIndex))
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
      const todoIndex = state.todos.findIndex(todo => todo.id === action.todoId)
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
        .onFinish(revalidateList(dispatch, todoIndex))
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
      set({ $todosById: groupByKey(state.todos, "id") })
    }

    if (diff(["todos"])) {
      set({
        $completedTodos: state.todos
          .filter(todo => todo.completed)
          .map(todo => todo.id),
      })
    }

    return state
  },
})

function revalidateList(
  dispatch: Dispatch<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple,
    any,
    any
  >,
  todoIndex: number
): AsyncPromiseOnFinishProps {
  const groupingIndex = Math.floor(todoIndex / 3)
  return {
    id: ["revalidating", groupingIndex],
    fn: (isLast, resolve, reject) => {
      const cleanUp = dispatch({
        type: "revalidate-todos",
        transition: ["revalidate-todo-list", groupingIndex],
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
      return () => {
        cleanUp()
      }
    },
  }
}

export const RevalidationList =
  createStoreUtils<typeof newRevalidationListStore>()
