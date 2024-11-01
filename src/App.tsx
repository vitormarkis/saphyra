import { useEffect, useState, useSyncExternalStore } from "react"
import { createStoreUtils } from "./createStoreUtils"
import { getTodos } from "./model/get-todos"
import { Todo } from "./model/todo"
import { TransitionsStore, TransitionsStoreState } from "./TransitionsStore"
import { createAsync } from "./createAsync"
import { Subject } from "./Subject"
import { Spinner } from "@blueprintjs/core"

type ArgsTuple = any[]
export type EventsTuple = Record<string, ArgsTuple>
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
      transitionName?: string
    }
  }
}

type TodosStoreProps = {}

type TodosState = {
  todos: Todo[]
  __transitionName: string | null
}

export class TodosStore extends Store<TodosState, NSTodos.Actions> {
  state: TodosState
  stateMiddleware: (state: TodosState, action?: NSTodos.Actions) => TodosState
  transitions: TransitionsStore

  constructor({}: TodosStoreProps) {
    super()
    this.stateMiddleware = stateMiddleware.bind(this)
    this.transitions = new TransitionsStore()

    this.state = {
      todos: [],
      __transitionName: null,
    }
  }
}

function stateMiddleware(
  this: TodosStore,
  intendedState: TodosState,
  action?: NSTodos.Actions
): TodosState {
  const state = { ...intendedState }

  if (action?.transitionName) {
    state.__transitionName = action.transitionName
  }

  if (action?.type === "load-todos") {
    const async = createAsync(this.transitions, state.__transitionName)
    async.promise(getTodos(), todos => {
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

function useTodosTransitions<R>(selector: (data: TransitionsStoreState) => R) {
  const [store] = useTodosUseState()
  return useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => selector(store.transitions.state)
  )
}

type ContentProps = {}

export function Content({}: ContentProps) {
  const [store] = useTodosUseState()
  const todos = useTodosStore(s => s.todos)
  const isLoading = useTodosTransitions(t => t.transitions["fetch-todos"] > 0)

  return (
    <div className="bg-black text-white cursor-default select-none min-h-screen">
      <button
        className="h-9 bg-sky-500"
        onClick={() => {
          store.dispatch({
            type: "load-todos",
            transitionName: "fetch-todos",
          })
        }}
        disabled={isLoading}
        style={{ opacity: isLoading ? 0.5 : 1 }}
      >
        {isLoading ? "Loading..." : "Load todos"}
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
