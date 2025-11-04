import { beforeEach, afterEach, describe, expect, test, vi } from "vitest"
import { newStoreDefTest } from "./test.utils"
import { AsyncPromiseOnFinishProps } from "./types"

type Todo = { id: number; completed: boolean }

const createTodoHelpers = (initialTodos: Todo[]) => {
  let TODOS_DB = initialTodos

  const getTodos = (): typeof TODOS_DB => JSON.parse(JSON.stringify(TODOS_DB))

  const toggleTodo = async (todoId: number) => {
    const todos = getTodos()
    TODOS_DB = todos.map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    )
  }

  return { getTodos, toggleTodo }
}

const createRevalidate = (dispatchAsync: any) => {
  return (): AsyncPromiseOnFinishProps => ({
    id: ["revalidate"],
    fn: (resolve, reject, { isLast }) => {
      dispatchAsync(
        {
          type: "revalidate-todos",
          transition: ["revalidate"],
          beforeDispatch: ({ action, store, transition }: any) => {
            if (!isLast()) return
            store.abort(transition)
            return action
          },
        },
        { onAbort: "noop" }
      )
        .then(resolve)
        .catch(reject)

      return () => {}
    },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("revalidation fails", () => {
  test("onFinish should abort branch when dispatchAsync rejects", async () => {
    const { getTodos, toggleTodo } = createTodoHelpers([
      { id: 1, completed: false },
    ])

    const newStore = newStoreDefTest({
      onConstruct() {
        return { todos: getTodos() }
      },
      reducer({ state, action, async, dispatchAsync }) {
        const revalidate = createRevalidate(dispatchAsync)

        if (action.type === "revalidate-todos") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve))
            throw new Error("Revalidation failed")
          })
        }

        if (action.type === "toggle-todo") {
          async()
            .onFinish(revalidate())
            .promise(async () => {
              await toggleTodo(action.todoId)
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store
      .dispatchAsync({
        type: "toggle-todo",
        todoId: 1,
        transition: ["toggle"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await promise

    expect(store.history).toStrictEqual([
      {
        todos: [{ id: 1, completed: false }],
      },
    ])
  })

  test("onFinish should discard both transitions when multiple actions fail revalidation", async () => {
    const { getTodos, toggleTodo } = createTodoHelpers([
      { id: 1, completed: false },
      { id: 2, completed: false },
    ])

    const newStore = newStoreDefTest({
      onConstruct() {
        return { todos: getTodos() }
      },
      reducer({ state, action, async, dispatchAsync }) {
        const revalidate = createRevalidate(dispatchAsync)

        if (action.type === "revalidate-todos") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve))
            throw new Error("Revalidation failed")
          })
        }

        if (action.type === "toggle-todo") {
          async()
            .onFinish(revalidate())
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              await toggleTodo(action.todoId)
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise1 = store
      .dispatchAsync({
        type: "toggle-todo",
        todoId: 1,
        transition: ["toggle", "1"],
      })
      .catch(() => {})

    await vi.advanceTimersByTimeAsync(50)

    const promise2 = store
      .dispatchAsync({
        type: "toggle-todo",
        todoId: 2,
        transition: ["toggle", "2"],
      })
      .catch(() => {})

    await vi.runAllTimersAsync()
    await Promise.all([promise1, promise2])

    expect(store.history).toStrictEqual([
      {
        todos: [
          { id: 1, completed: false },
          { id: 2, completed: false },
        ],
      },
    ])
  })
})

describe("revalidation succeeds", () => {
  test("onFinish should commit branch when dispatchAsync resolves", async () => {
    const { getTodos, toggleTodo } = createTodoHelpers([
      { id: 1, completed: false },
    ])

    const newStore = newStoreDefTest({
      onConstruct() {
        return { todos: getTodos() }
      },
      reducer({ state, action, set, async, dispatchAsync }) {
        const revalidate = createRevalidate(dispatchAsync)

        if (action.type === "revalidate-todos") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve))
            set({ todos: getTodos() })
          })
        }

        if (action.type === "toggle-todo") {
          async()
            .onFinish(revalidate())
            .promise(async () => {
              await toggleTodo(action.todoId)
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise = store.dispatchAsync({
      type: "toggle-todo",
      todoId: 1,
      transition: ["toggle"],
    })

    await vi.runAllTimersAsync()
    await promise

    expect(store.history).toHaveLength(2)
    expect(store.history).toStrictEqual([
      {
        todos: [{ id: 1, completed: false }],
      },
      {
        todos: [{ id: 1, completed: true }],
      },
    ])
  })

  test("onFinish should commit both transitions when multiple actions succeed revalidation", async () => {
    const { getTodos, toggleTodo } = createTodoHelpers([
      { id: 1, completed: false },
      { id: 2, completed: false },
    ])

    const newStore = newStoreDefTest({
      onConstruct() {
        return { todos: getTodos() }
      },
      reducer({ state, action, set, async, dispatchAsync }) {
        const revalidate = createRevalidate(dispatchAsync)

        if (action.type === "revalidate-todos") {
          async().promise(async () => {
            await new Promise(resolve => setTimeout(resolve))
            set({ todos: getTodos() })
          })
        }

        if (action.type === "toggle-todo") {
          async()
            .onFinish(revalidate())
            .promise(async () => {
              await new Promise(resolve => setTimeout(resolve, 100))
              await toggleTodo(action.todoId)
            })
        }

        return state
      },
    })

    const store = newStore({})

    const promise1 = store.dispatchAsync({
      type: "toggle-todo",
      todoId: 1,
      transition: ["toggle", "1"],
    })

    await vi.advanceTimersByTimeAsync(50)

    const promise2 = store.dispatchAsync({
      type: "toggle-todo",
      todoId: 2,
      transition: ["toggle", "2"],
    })

    await vi.runAllTimersAsync()
    await Promise.all([promise1, promise2])

    expect(store.history[0]).toStrictEqual({
      todos: [
        { id: 1, completed: false },
        { id: 2, completed: false },
      ],
    })

    expect(store.history[1]).toStrictEqual({
      todos: [
        { id: 1, completed: true },
        { id: 2, completed: true },
      ],
    })

    expect(store.history[2]).toBeUndefined()
  })
})
