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
import { settingsStore } from "./settings-store"

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
  reducer({ state, action, set, diff, async, dispatch, optimistic }) {
    const settings = settingsStore.getState()
    if (action.type === "revalidate-todos") {
      async()
        .setName("fetch() hitting API")
        .promise(async ctx => {
          const todos = await getTodosFromDb(ctx.signal)
          set({ todos })
        })
    }

    if (action.type === "toggle-todo") {
      const todoIndex = state.todos.findIndex(todo => todo.id === action.todoId)
      if (settings.optimistic) {
        const optimisticCompleted = !state.$completedTodos.includes(
          action.todoId
        )
        optimistic(s => ({
          todos: s.todos.map(todo =>
            todo.id === action.todoId
              ? { ...todo, completed: optimisticCompleted }
              : todo
          ),
        }))
      }

      async()
        .setName("toggle-todo")
        .onFinish(revalidateList(dispatch, todoIndex))
        .promise(async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
        })
    }

    if (action.type === "toggle-disabled") {
      const todoIndex = state.todos.findIndex(todo => todo.id === action.todoId)
      if (settings.optimistic) {
        const optimisticDisabled = !state.todos[todoIndex].disabled

        optimistic(s => ({
          todos: s.todos.map(todo =>
            todo.id === action.todoId
              ? { ...todo, disabled: optimisticDisabled }
              : todo
          ),
        }))
      }
      async()
        .setName("toggle-disabled-todo")
        .onFinish(revalidateList(dispatch, todoIndex))
        .promise(async ctx => {
          await toggleTodoDisabledInDb(action.todoId, ctx.signal)
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
  const batchKeyMaybe = settingsStore.getState().revalidateInDifferentBatches
    ? [Math.floor(todoIndex / 2)]
    : []
  return {
    id: ["revalidating", ...batchKeyMaybe],
    fn: (resolve, reject, { error, isLast }) => {
      const cleanUp = dispatch({
        type: "revalidate-todos",
        transition: ["revalidate-todo-list", ...batchKeyMaybe],
        beforeDispatch: ({ action, store, transition }) => {
          if (!isLast()) return
          store.abort(transition)
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
