import {
  assignObjValues,
  AsyncPromiseOnFinishProps,
  BeforeDispatchOptions,
  Dispatch,
  DispatchAsync,
  EventsTuple,
  InnerReducerSet,
  newStoreDef,
  ReducerSet,
  SetterOrPartialState,
  SomeStore,
  SomeStoreGeneric,
  Transition,
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
  | {
      type: "prefix-pairs"
      pairIds: [number, number]
    }

let pairRevalidations = 0

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
    state,
    action,
    set,
    diff,
    async,
    dispatch,
    dispatchAsync,
    optimistic,
    store,
    isOptimistic,
  }) {
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
        .onFinish(
          settings.manualRevalidation
            ? undefined
            : revalidateList(
                dispatch,
                set,
                todoIndex,
                store,
                action.transition!,
                dispatchAsync,
                undefined,
                state
              )
        )
        .promise(async ctx => {
          await toggleTodoInDb(action.todoId, ctx.signal)
          // set(s => ({
          //   completingTodos: s.completingTodos.includes(action.todoId)
          //     ? s.completingTodos.filter(todoId => todoId !== action.todoId)
          //     : [...s.completingTodos, action.todoId],
          // }))
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
        .onFinish(
          settings.manualRevalidation
            ? undefined
            : revalidateList(
                dispatch,
                set,
                todoIndex,
                store,
                action.transition!,
                dispatchAsync,
                undefined,
                state
              )
        )
        .promise(async ctx => {
          await toggleTodoDisabledInDb(action.todoId, ctx.signal)
        })
    }

    if (action.type === "prefix-pairs") {
      async()
        .setName("prefix-pairs")
        .onFinish(
          settings.manualRevalidation
            ? undefined
            : revalidateList(
                dispatch,
                set,
                action.pairIds[0],
                store,
                action.transition!,
                dispatchAsync,
                "ppaaiirr",
                state
              )
        )
        .promise(async ctx => {
          await prefixPairsInDb(action.pairIds, ctx.signal).catch()
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

    // Async Effects
    if (settings.prefixPairs) {
      if (diff(["$completedTodos"])) {
        const pairs = getPairs({
          completedTodos: state.$completedTodos,
          todosById: state.$todosById,
        })

        const tuples = Object.values(pairs).filter(tuple => tuple.length === 2)
        const shouldGroup = tuples.length > 0
        if (shouldGroup) {
          noop()
          async()
            .setName("prefix-pairs-batch")
            .promise(async () => {
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
            })
        }
      }
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
  set: ReducerSet<RevalidationListState>,
  todoIndex: number,
  store: SomeStore<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple,
    any,
    any
  >,
  transition: Transition,
  dispatchAsync: DispatchAsync<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple,
    any,
    any
  >,
  userKey?: string,
  state?: RevalidationListState
): AsyncPromiseOnFinishProps {
  const batchKeyMaybe = settingsStore.getState().revalidateInDifferentBatches
    ? [Math.floor(todoIndex / 2)]
    : []
  const transitionRevalidate = [
    "revalidate-todo-list",
    ...batchKeyMaybe,
    ...(userKey ? [userKey] : []),
  ]
  const transitionRevalidateKey = transitionRevalidate.join(":")
  return {
    id: transitionRevalidateKey,
    fn: (resolve, reject, { isLast }) => {
      dispatchAsync(
        {
          type: "revalidate-todos",
          transition: transitionRevalidate,
          beforeDispatch: ({ action, store, transition }) => {
            if (!isLast()) return
            store.abort(transition) // mesma coisa, cancelou transistion [revalidate-todo-list]
            return action
          },
        },
        { onAbort: "noop" }
      )
        .then(resolve)
        .catch(reject)

      return () => {
        store.abort(transitionRevalidate)
      }
    },
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
