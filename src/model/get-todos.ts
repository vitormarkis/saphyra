const TODO_LIST = [
  { id: 1, title: "Buy milk", completed: false },
  { id: 2, title: "Buy bread", completed: false },
  { id: 3, title: "Buy eggs", completed: false },
  { id: 4, title: "Buy cheese", completed: false },
  { id: 5, title: "Buy butter", completed: false },
  { id: 6, title: "Buy chocolate", completed: false },
  { id: 7, title: "Buy coffee", completed: false },
  { id: 8, title: "Buy sugar", completed: false },
  { id: 9, title: "Buy coffee", completed: false },
  { id: 10, title: "Buy sugar", completed: false },
]

export async function getTodos() {
  await new Promise(res => setTimeout(res, 700))
  return TODO_LIST
}
