import { expect, test } from "vitest"
import { newStoreDefTest } from "./test.utils"

test("ensure derivation is updated on dispatch async set", async () => {
  let TODOS_DB = [{ id: "abc", completed: false }]

  const getTodos = (): typeof TODOS_DB => JSON.parse(JSON.stringify(TODOS_DB))

  const toggleTodo = async (todoId: string) => {
    const todos = getTodos()
    TODOS_DB = todos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    )
    return todos
  }

  const newStore = newStoreDefTest({
    onConstruct() {
      return { todos: getTodos() }
    },
    reducer({ state, action, set, async, dispatchAsync, diff }) {
      if (action.type === "revalidate") {
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve))
          set({ todos: getTodos() })
        })
      }

      if (action.type === "toggle") {
        async().promise(async () => {
          await new Promise(resolve => setTimeout(resolve))
          toggleTodo(action.todoId)
          await dispatchAsync({
            type: "revalidate",
            transition: ["revalidate"],
          })
        })
      }

      diff()
        .on([s => s.todos])
        .run(todos => {
          set({
            $todosById: todos.reduce((acc: any, todo: any) => {
              acc[todo.id] = todo
              return acc
            }, {}),
          })
        })

      return state
    },
  })

  const store = newStore({})
  await store.dispatchAsync({
    type: "toggle",
    todoId: "abc",
    transition: ["toggle"],
  })
  expect(store.history).toStrictEqual([
    {
      todos: [{ id: "abc", completed: false }],
      $todosById: { abc: { id: "abc", completed: false } },
    },
    {
      todos: [{ id: "abc", completed: true }],
      $todosById: { abc: { id: "abc", completed: true } },
    },
  ])
})
