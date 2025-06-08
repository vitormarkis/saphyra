import {
  AsyncPromiseOnFinishProps,
  Dispatch,
  EventsTuple,
  newStoreDef,
  OnFinishId,
  Reducer,
  ReducerProps,
  runSuccessCallback,
} from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { TodoType } from "./types"
import { reduceGroupById } from "./fn/reduce-group-by-user-id"
import { groupByKey } from "~/lib/reduce-group-by"
import {
  getTodosFromDb,
  toggleTodoInDb,
  toggleTodoDisabledInDb,
} from "./fn/fake-todos-db"
import { cancelPrevious } from "./before-dispatches"
import { PromiseWithResolvers } from "./polyfills/promise-with-resolvers"
import { randomString } from "~/lib/utils"

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
  dispatch: Dispatch<
    RevalidationListState,
    RevalidationListActions,
    EventsTuple
  >
) {
  return new Promise((resolve, reject) => {
    dispatch({
      type: "revalidate-todos",
      transition: ["revalidate-todo-list"],
      onTransitionEnd: ({ aborted, error }) => {
        if (aborted) return
        if (error) return reject(error)
        return resolve(true)
      },
    })
  })
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
    if (action.type === "revalidate-todos") {
      async()
        .setName("revalidate-todos")
        .promise(async ctx => {
          const todos = await getTodosFromDb(ctx.signal)
          set({ todos })
        })
    }

    if (action.type === "toggle-todo") {
      const optimisticCompleted = !state.$completedTodos.includes(action.todoId)
      optimistic(s => ({
        todos: s.todos.map(todo =>
          todo.id === action.todoId
            ? { ...todo, completed: optimisticCompleted }
            : todo
        ),
      }))

      async()
        .setName("complete")
        .onFinish(revalidateList(dispatch))
        .promise(async ctx => {
          // store.abort(["revalidate-todo-list"])
          await toggleTodoInDb(action.todoId, ctx.signal)
          // await revalidateTodoList(dispatch)
        })
    }

    if (action.type === "toggle-disabled") {
      const optimisticDisabled = !state.todos.find(
        todo => todo.id === action.todoId
      )?.disabled

      optimistic(s => ({
        todos: s.todos.map(todo =>
          todo.id === action.todoId
            ? { ...todo, disabled: optimisticDisabled }
            : todo
        ),
      }))
      async()
        .setName("disable")
        .onFinish(revalidateList(dispatch))
        .promise(async ctx => {
          // store.abort(["revalidate-todo-list"])
          await toggleTodoDisabledInDb(action.todoId, ctx.signal)
          // await revalidateTodoList(dispatch)
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
    id: ["revalidating", "board"],
    fn: (isLast, resolve, reject) => {
      return dispatch({
        type: "revalidate-todos",
        transition: ["revalidate-todo-list"],
        beforeDispatch: ({ action, createAsync, store }) => {
          if (!isLast()) return
          const async = createAsync()
          async()
            .setName("d")
            .timer(() => (isLast() ? store.dispatch(action) : {}), 300)
        },
        onTransitionEnd: ({ aborted, error }) => {
          if (aborted) return
          if (error) return reject(error)
          return resolve(true)
        },
      })
    },
  }
}

export const RevalidationList =
  createStoreUtils<typeof newRevalidationListStore>()

// function reducer({ prevState, state, action, set, diff, async, dispatch }) {
//   if (action.type === "toggle-todo") {
//     async().promise(
//       async ctx => {
//         await toggleTodoInDb(action.todoId, ctx.signal)
//       },
//       {
//         label: "fetch",
//         onFinish: {
//           id: ["revalidate-todo-list", action.pageId],
//           fn: (isLast, resolve, reject) => {
//             store.transitionStore.on(
//               "transition-done",
//               (transitionName, status) => {
//                 if (status === "aborted") return
//                 cleanUp()
//                 if (status === "error") return reject(true)
//                 return resolve(true)
//               }
//             )
//             if (isLast) {
//               dispatch({
//                 type: "revalidate-todos",
//                 transition: ["revalidate-todo-list"],
//               })
//             }

//             return () => {
//               cleanUp()
//               if (isLast) {
//                 store.abort(["revalidate-todo-list"])
//               }
//             }
//           },
//         },
//       }
//     )

//     async()
//       .setName("toggle-todo")
//       .promise(async ctx => {
//         await toggleTodoInDb(action.todoId, ctx.signal)
//       })
//       .onFinish(
//         ["revalidate-todo-list", action.pageId],
//         (isLast, resolve, reject) => {
//           const cleanUp = dispatch({
//             type: "revalidate-todos",
//             transition: ["revalidate-todo-list"],
//             pageId: action.pageId,
//             beforeDispatch: ({ action }) => {
//               if (isLast) return action
//             },
//             onTransitionEnd: ({ aborted, error }) => {
//               if (aborted) return
//               if (error) return reject(error)
//               return resolve(true)
//             },
//           })

//           return () => cleanUp()
//         }
//       )

//     async().promise(
//       async ctx => {
//         await toggleTodoInDb(action.todoId, ctx.signal)
//       },
//       {
//         label: "fetch",
//         onFinish: {
//           id: ["revalidate-todo-list", action.pageId],
//           fn: (isLast, resolve, reject) =>
//             dispatch({
//               type: "revalidate-todos",
//               transition: ["revalidate-todo-list"],
//               pageId: action.pageId,
//               beforeDispatch: ({ action }) => {
//                 if (isLast) return action
//               },
//               onTransitionEnd: ({ aborted, error }) => {
//                 if (aborted) return
//                 if (error) return reject(error)
//                 return resolve(true)
//               },
//             }),
//         },
//       }
//     )
//   }

//   if (action.type === "change-todo-title") {
//     async().promise(
//       async ctx => {
//         await changeTodoTitleInDb(action.todoId, ctx.signal)
//       },
//       {
//         label: "fetch",
//         onFinish: {
//           id: ["revalidate-todo-list"],
//           fn: (resolve, reject) => {
//             dispatch({
//               type: "revalidate-todos",
//               transition: ["revalidate-todo-list"],
//               onTransitionEnd: ({ aborted, error }) => {
//                 if (aborted) return
//                 if (error) return reject(error)
//                 return resolve(true)
//               },
//             })

//             return () => {
//               store.abort(["revalidate-todo-list"])
//             }
//           },
//         },
//       }
//     )
//   }
// }
