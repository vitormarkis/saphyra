import { range } from "~/lib/range"
import { TodoType } from "../types"

export let FAKE_TODOS_DB: TodoType[] = [
  {
    id: 1,
    title: "Buy groceries",
    completed: false,
  },
  {
    id: 2,
    title: "Finish project documentation",
    completed: true,
  },
  {
    id: 3,
    title: "Schedule dentist appointment",
    completed: false,
  },
  {
    id: 4,
    title: "Clean the house",
    completed: false,
  },
  {
    id: 5,
    title: "Pay monthly bills",
    completed: true,
  },
  {
    id: 6,
    title: "Go to the gym",
    completed: false,
  },
  {
    id: 7,
    title: "Read a book",
    completed: false,
  },
  {
    id: 8,
    title: "Call mom",
    completed: true,
  },
  {
    id: 9,
    title: "Update resume",
    completed: false,
  },
  {
    id: 10,
    title: "Plan weekend trip",
    completed: false,
  },
  {
    id: 11,
    title: "Fix broken laptop",
    completed: true,
  },
  {
    id: 12,
    title: "Learn new programming language",
    completed: false,
  },
  {
    id: 13,
    title: "Organize photos",
    completed: false,
  },
  {
    id: 14,
    title: "Buy birthday gift",
    completed: true,
  },
  {
    id: 15,
    title: "Practice guitar",
    completed: false,
  },
  {
    id: 16,
    title: "Write blog post",
    completed: false,
  },
]

export async function getTodosFromDb(signal: AbortSignal): Promise<TodoType[]> {
  const snapshot = JSON.parse(JSON.stringify(FAKE_TODOS_DB))
  await new Promise(resolve => setTimeout(resolve, range(300, 1500)))

  if (signal.aborted) {
    throw new Error("Operation aborted")
  }

  return snapshot
}

export async function toggleTodoInDb(todoId: number, signal: AbortSignal) {
  await new Promise(resolve => setTimeout(resolve, range(300, 700)))

  if (signal.aborted) {
    throw new Error("Aborted")
  }

  const todo = FAKE_TODOS_DB.find(todo => todo.id === todoId)
  if (!todo) {
    throw new Error(`Todo with id ${todoId} not found`)
  }

  FAKE_TODOS_DB = FAKE_TODOS_DB.map(todo =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  )
}
