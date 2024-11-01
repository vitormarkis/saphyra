import { useEffect, useState, useSyncExternalStore } from "react"
import { createStoreUtils } from "./createStoreUtils"
import { getTodos } from "./model/get-todos"
import { TransitionsStore, TransitionsStoreState } from "./TransitionsStore"
import { Subject } from "./Subject"
import { createAsync_2 } from "./createAsync_2"
import { Todo } from "./model/todo"
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
    export type Union = LoadTodos | ToggleTodos

    export type LoadTodos = {
      type: "load-todos"
      transitionName?: string
      transition: any[]
    }

    export type ToggleTodos = {
      type: "toggle-todo"
      todoId: number
      transitionName?: string
      transition: any[]
    }
  }
}

type TodosStoreProps = {}

type TodosState = {
  todos: Todo[]
  __transitionName: string | null
  currentTransition: any[] | null
  _todosById: Record<string, Todo>
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
      currentTransition: null,
      _todosById: {},
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
  if (action?.transition) {
    state.currentTransition = action.transition
  }

  if (action?.type === "load-todos") {
    const async = createAsync_2(this.transitions, state.currentTransition)
    async.promise(getTodos(), todos => {
      this.setStatePartial({ todos })
    })
  }

  if (action?.type === "toggle-todo") {
    const async = createAsync_2(this.transitions, state.currentTransition)
    const toggleTodo = createToggleTodo(this)
    async.promise(toggleTodo(action.todoId), todos => {
      this.setStatePartial({ todos })
    })
  }

  if (!Object.is(this.state.todos, state.todos)) {
    state._todosById = state.todos.reduce((acc, todo) => {
      acc[todo.id] = todo
      return acc
    }, {} as Record<string, Todo>)
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

function useTodosTransitionsKey(key: any[]) {
  const [store] = useTodosUseState()
  return useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.get(key)
  )
}

type ContentProps = {}

export function Content({}: ContentProps) {
  const [store] = useTodosUseState()
  const todos = useTodosStore(s => s.todos)
  // const isLoading = useTodosTransitions(t => t.transitions["fetch-todos"] > 0)
  const isLoadingTodos = useTodosTransitionsKey(["todos", "fetch-all"])
  const isTodosTransitioning = useTodosTransitionsKey(["todos"])

  return (
    <div className="bg-black text-white cursor-default select-none min-h-screen">
      <div className="flex items-center gap-2">
        <button
          className="h-9 bg-sky-500"
          onClick={() => {
            store.dispatch({
              type: "load-todos",
              transitionName: "fetch-todos",
              transition: ["todos", "fetch-all"],
            })
          }}
          disabled={isLoadingTodos > 0}
          style={{ opacity: isLoadingTodos ? 0.5 : 1 }}
        >
          {isLoadingTodos ? "Loading..." : "Load todos"}
        </button>
        {isTodosTransitioning ? <Spinner size={20} /> : null}
      </div>
      <div className="flex flex-col">
        {todos.map(todo => (
          <TodoComponent
            key={todo.id}
            todoId={todo.id}
          />
        ))}
      </div>
    </div>
  )
}

type TodoProps = {
  todoId: number
}

export function TodoComponent({ todoId }: TodoProps) {
  const [store] = useTodosUseState()
  const todo = useTodosStore(s => s._todosById[todoId])
  const thisTodoIsToggling = useTodosTransitionsKey(["todos", "toggle", todo.id])
  const someTodoIsToggling = useTodosTransitionsKey(["todos", "toggle"])

  return (
    <button
      onClick={() => {
        store.dispatch({
          type: "toggle-todo",
          todoId: todo.id,
          transition: ["todos", "toggle", todo.id],
        })
      }}
      className="bg-slate-500 border border-slate-400 h-9"
      key={todo.id}
      disabled={someTodoIsToggling > 0}
      style={{
        opacity: thisTodoIsToggling ? 0.5 : 1,
        cursor: someTodoIsToggling ? "no-drop" : "pointer",
      }}
    >
      {todo.title}
    </button>
  )
}

function createToggleTodo(store: TodosStore) {
  return async function toggleTodo(todoId: number) {
    await new Promise(res => setTimeout(res, 700))
    return store.state.todos.map(todo => {
      if (todo.id === todoId) {
        return { ...todo, completed: !todo.completed }
      }
      return todo
    })
  }
}
