import { range } from "~/lib/range"
import { TodoType } from "../types"
import { settingsStore } from "../settings-store"
import { createLuck } from "~/lib/create-luck"

export let FAKE_TODOS_DB: TodoType[] = [
  {
    id: 1,
    title: "Buy groceries",
    completed: false,
    disabled: false,
  },
  {
    id: 2,
    title: "Finish project documentation",
    completed: false,
    disabled: false,
  },
  {
    id: 3,
    title: "Schedule dentist appointment",
    completed: false,
    disabled: false,
  },
  {
    id: 4,
    title: "Clean the house",
    completed: false,
    disabled: false,
  },
  {
    id: 5,
    title: "Pay monthly bills",
    completed: false,
    disabled: false,
  },
  {
    id: 6,
    title: "Go to the gym",
    completed: false,
    disabled: false,
  },
  {
    id: 7,
    title: "Read a book",
    completed: false,
    disabled: false,
  },
  {
    id: 8,
    title: "Call mom",
    completed: false,
    disabled: false,
  },
  {
    id: 9,
    title: "Update resume",
    completed: false,
    disabled: false,
  },
  {
    id: 10,
    title: "Plan weekend trip",
    completed: false,
    disabled: false,
  },
  {
    id: 11,
    title: "Fix broken laptop",
    completed: false,
    disabled: false,
  },
  {
    id: 12,
    title: "Learn new programming language",
    completed: false,
    disabled: false,
  },
  {
    id: 13,
    title: "Organize photos",
    completed: false,
    disabled: false,
  },
  {
    id: 14,
    title: "Buy birthday gift",
    completed: false,
    disabled: false,
  },
  {
    id: 15,
    title: "Practice guitar",
    completed: false,
    disabled: false,
  },
  {
    id: 16,
    title: "Write blog post",
    completed: false,
    disabled: false,
  },
]

export async function getTodosFromDb(signal: AbortSignal): Promise<TodoType[]> {
  const snapshot = JSON.parse(JSON.stringify(FAKE_TODOS_DB))
  await new Promise(resolve => setTimeout(resolve, 700))

  if (signal.aborted) {
    throw new Error("Operation aborted")
  }

  return snapshot
}

export async function toggleTodoInDb(todoId: number, signal: AbortSignal) {
  await new Promise(resolve => setTimeout(resolve, range(200, 600)))
  const settings = settingsStore.getState()

  if (signal.aborted) {
    throw new Error("Aborted")
  }

  if (settings.errorSometimes || settings.errorAlways) {
    const should = settings.errorAlways || Math.random() > 0.7
    if (should) {
      throw new Error("Error while toggling todo")
    }
  }

  const todo = FAKE_TODOS_DB.find(todo => todo.id === todoId)
  if (!todo) {
    throw new Error(`Todo with id ${todoId} not found`)
  }

  FAKE_TODOS_DB = FAKE_TODOS_DB.map(todo =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  )
}

export async function toggleTodoDisabledInDb(
  todoId: number,
  signal: AbortSignal
) {
  await new Promise(resolve => setTimeout(resolve, range(200, 600)))
  const settings = settingsStore.getState()
  if (signal.aborted) {
    throw new Error("Aborted")
  }

  if (settings.errorSometimes || settings.errorAlways) {
    const should = settings.errorAlways || Math.random() > 0.7
    if (should) {
      throw new Error("Error while toggling todo disabled")
    }
  }

  const todo = FAKE_TODOS_DB.find(todo => todo.id === todoId)
  if (!todo) {
    throw new Error(`Todo with id ${todoId} not found`)
  }

  FAKE_TODOS_DB = FAKE_TODOS_DB.map(todo =>
    todo.id === todoId ? { ...todo, disabled: !todo.disabled } : todo
  )
}
