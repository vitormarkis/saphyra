import {
  AsyncPromiseOnFinishProps,
  DispatchAsync,
  EventsTuple,
  newStoreDef,
  SomeStore,
} from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { TodoType } from "./types"
import { groupByKey } from "~/lib/reduce-group-by"
import {
  getTodosFromDb,
  toggleTodoInDb,
  toggleTodoDisabledInDb,
  prefixPairsInDb,
} from "./fn/fake-todos-db"
import { noop } from "~/lib/utils"
import { settingsStore } from "./settings-store"
import { preventNextOne } from "./before-dispatches"

type RevalidationListState = {
  todos: Promise<TodoType[]>
  $todosById: Promise<Record<number, TodoType>>
  $completedTodos: Promise<number[]>
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
  | {
      type: "prefix-pairs"
      pairIds: [number, number]
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
  onConstruct({ signal }) {
    return { todos: getTodosFromDb(signal) }
  },
  reducer({
    state,
    action,
    set,
    diff,
    async,
    dispatchAsync,
    optimistic,
    store,
    use,
  }) {
    const revalidateList = createRevalidateList(dispatchAsync, store)

    const settings = settingsStore.getState()
    if (action.type === "revalidate-todos") {
      async()
        .setName("revalidate-todos")
        .promise(async ({ signal }) => {
          const todosPromise = getTodosFromDb(signal)
          // optimistic({ todos: todosPromise })
          set({ todos: todosPromise })
          await todosPromise
        })
    }

    if (action.type === "toggle-todo") {
      async()
        .setName("toggle-todo")
        .onFinish(settings.manualRevalidation ? undefined : revalidateList(0))
        .promise(async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
        })
    }

    if (action.type === "toggle-disabled") {
      if (settings.optimistic) {
        optimistic(s => ({
          todos: s.todos.then(todos =>
            todos.map(todo =>
              todo.id === action.todoId
                ? { ...todo, disabled: action.disabled }
                : todo
            )
          ),
        }))
      }
      async()
        .setName("toggle-disabled-todo")
        .onFinish(settings.manualRevalidation ? undefined : revalidateList(0))
        .promise(async ctx => {
          await toggleTodoDisabledInDb(action.todoId, ctx.signal)
        })
    }

    if (action.type === "prefix-pairs") {
      async()
        .setName("prefix-pairs")
        .onFinish(settings.manualRevalidation ? undefined : revalidateList(0))
        .promise(async ctx => {
          await prefixPairsInDb(action.pairIds, ctx.signal).catch()
        })
    }

    if (diff(["todos"])) {
      set({ $todosById: state.todos.then(todos => groupByKey(todos, "id")) })
    }

    if (diff(["todos"])) {
      set({
        $completedTodos: state.todos.then(todos =>
          todos.filter(todo => todo.completed).map(todo => todo.id)
        ),
      })
    }

    // Async Effects
    if (settings.prefixPairs) {
      if (diff(["$completedTodos"])) {
        const pairs = getPairs({
          completedTodos: use(state.$completedTodos),
          todosById: use(state.$todosById),
        })

        const tuples = Object.values(pairs).filter(tuple => tuple.length === 2)
        const shouldGroup = tuples.length > 0
        async()
          .setName("prefix-pairs-batch")
          .promise(async () => {
            if (shouldGroup) {
              const promises = tuples.map(async tuple => {
                const [first, second] = tuple
                await dispatchAsync({
                  type: "prefix-pairs",
                  pairIds: [first, second],
                  transition: ["prefix-pairs", `${first}-${second}`],
                  beforeDispatch: preventNextOne,
                })
              })
              await Promise.all(promises)
            }
          })
      }
    }

    return state
  },
})

function createRevalidateList(
  dispatchAsync: DispatchAsync<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple,
    any,
    any
  >,
  store: SomeStore<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple,
    any,
    any
  >
) {
  return function revalidateList(todoIndex: number): AsyncPromiseOnFinishProps {
    const batchKeyMaybe = settingsStore.getState().revalidateInDifferentBatches
      ? [Math.floor(todoIndex / 2)]
      : []

    return {
      id: ["revalidate-todo-list", ...batchKeyMaybe],
      fn: (resolve, reject, { isLast }) => {
        dispatchAsync(
          {
            type: "revalidate-todos",
            transition: ["revalidate-todo-list", ...batchKeyMaybe],
            beforeDispatch: ({ action, store, transition }) => {
              if (!isLast()) return
              store.abort(transition)
              return action
            },
          },
          { onAbort: "noop" }
        )
          .then(resolve)
          .catch(reject)

        return () => {
          store.abort(["revalidate-todo-list", ...batchKeyMaybe])
        }
      },
    }
  }
}

export const RevalidationList =
  createStoreUtils<typeof newRevalidationListStore>()

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null || value !== undefined
}

type GetPairsProps = {
  completedTodos: number[]
  todosById: Record<number, TodoType>
}

const getPairs = ({ completedTodos, todosById }: GetPairsProps) => {
  return completedTodos
    .map(todoId => todosById[todoId])
    .filter(nonNullable)
    .filter(todo => !todo.prefixed)
    .map(todo => todo.id)
    .reduce((acc, todoId, idx) => {
      const groupingIdx = Math.floor(idx / 2)
      acc[groupingIdx] ??= []
      acc[groupingIdx].push(todoId)
      return acc
    }, [] as number[][])
}
