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
      type: "revalidate-todos"
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
      async()
        .setName("toggle")
        .promise(async ctx => {
          store.abort(["fetch", "todos"])
          await toggleTodoInDb(action.todoId, ctx.signal)
        })
        .onFinish({
          id: ["revalidate-todo-list"],
          fn: (isLast, resolve, reject) => {
            const cleanUp = dispatch({
              type: "revalidate-todos",
              transition: ["revalidate-todo-list"],
              beforeDispatch: ({ action }) => {
                if (isLast) return action
              },
              onTransitionEnd: ({ aborted, error }) => {
                if (aborted) return
                if (error) return reject(error)
                return resolve(true)
              },
            })

            return () => cleanUp()
          },
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
