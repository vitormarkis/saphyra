import { useEffect, useState } from "react"
import { createStoreUtils } from "./createStoreUtils"
import { getTodos } from "./model/get-todos"
import { Todo } from "./model/todo"

export type AnyFunction = (...args: any[]) => any
type ArgsTuple = any[]
export type EventsTuple = Record<string, ArgsTuple>
export abstract class Subject<T extends AnyFunction = AnyFunction> {
  observers = new Set<T>()

  notify() {
    this.observers.forEach(cb => cb())
  }

  subscribe(cb: T) {
    this.observers.add(cb)
    return () => this.observers.delete(cb)
  }
}

export abstract class Store<T, TActions> extends Subject {
  abstract state: T
  abstract stateMiddleware: (state: T, action?: TActions) => T

  setStatePartial(newState: Partial<T>): void
  setStatePartial(arg1: ((state: T) => Partial<T>) | Partial<T>) {
    let newStateSetter = typeof arg1 === "function" ? arg1(this.state) : arg1

    const newState = {
      ...this.state,
      ...newStateSetter,
    }

    this.state = this.stateMiddleware ? this.stateMiddleware(newState) : newState
    this.notify()
  }

  dispatch(action: TActions) {
    this.state = this.stateMiddleware(this.state, action)
    this.notify()
  }
}

export namespace NSTodos {
  export type Actions = Events.Union
  export namespace Events {
    export type Union = LoadTodos

    export type LoadTodos = {
      type: "load-todos"
    }
  }
}

type TodosStoreProps = {}

type TodosState = {
  todos: Todo[]
}

export class TodosStore extends Store<TodosState, NSTodos.Actions> {
  state: TodosState
  stateMiddleware: (state: TodosState, action?: NSTodos.Actions) => TodosState

  constructor({}: TodosStoreProps) {
    super()
    this.stateMiddleware = stateMiddleware.bind(this)

    this.state = {
      todos: [],
    }
  }
}

function stateMiddleware(
  this: TodosStore,
  intendedState: TodosState,
  action?: NSTodos.Actions
): TodosState {
  const state = { ...intendedState }

  if (action?.type === "load-todos") {
    getTodos().then(todos => {
      this.setStatePartial({ todos })
    })
  }

  return state
}

export const [TodosContext, useTodosStore, useTodosUseState] = createStoreUtils<
  TodosStore,
  TodosState
>()

export default function App() {
  const storeState = useState(() => new TodosStore({}))
  const [store] = storeState

  useEffect(() => {
    Object.assign(window, { store })
  }, [])

  return (
    <TodosContext.Provider value={storeState}>
      <Content />
    </TodosContext.Provider>
  )
}

type ContentProps = {}

export function Content({}: ContentProps) {
  const [store] = useTodosUseState()
  const todos = useTodosStore(s => s.todos)

  return (
    <div className="bg-black text-white cursor-default select-none min-h-screen">
      <button
        className="h-9 bg-sky-500"
        onClick={() => {
          store.dispatch({ type: "load-todos" })
        }}
      >
        Load todos
      </button>
      <div className="flex flex-col gap-1">
        {todos.map(todo => (
          <div
            className="bg-slate-500"
            key={todo.id}
          >
            {todo.title}
          </div>
        ))}
      </div>
    </div>
  )
}
