import { useEffect, useState, useSyncExternalStore } from "react"
import { createStoreFactory } from "../../create-store"
import { sleep } from "../../sleep"
import { createStoreUtils } from "../../createStoreUtils"
import { cn } from "../../lib/utils"
import { Spinner } from "@blueprintjs/core"

type TodosStoreInitialProps = {
  todos: Record<string, any>[]
  count: number
  $direction: "up" | "down"
  currentTransition: null
}

const createTodosStore = createStoreFactory<TodosStoreInitialProps>({
  onConstruct({ initialProps, store }) {
    store.uncontrolledState = {}
    return initialProps
  },
  reducer({ prevState, state, action, async, set, store }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }
    if (action.type === "decrement") {
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-ten") {
      async.promise(sleep(3200), (_, actor) => {
        actor.set(s => ({ count: s.count + 10 }))
      })
    }

    if (action.type === "increment-three") {
      async.promise(sleep(4000), (_, actor) => {
        actor.set(s => ({ count: s.count + 3 }))
      })
    }

    if (state.count !== prevState.count) {
      set(s => ({ $direction: prevState.count <= s.count ? "up" : "down" }))
    }

    return state
  },
})

export const Todos = createStoreUtils<typeof createTodosStore>()

export function HowTransitionsWorkPage() {
  let [todosStore, setTodosStore] = useState(() =>
    createTodosStore({ todos: [], count: 0, $direction: "down", currentTransition: null })
  )

  useEffect(() => {
    Object.assign(window, { todosStore })
  }, [])

  return (
    <Todos.Provider value={[todosStore, setTodosStore]}>
      <Content />
    </Todos.Provider>
  )
}

const display = [
  {
    name: "Increment (general)",
    transition: ["increment"],
  },
  {
    name: "Increment (3)",
    transition: ["increment", "three"],
  },
  {
    name: "Increment (10)",
    transition: ["increment", "ten"],
  },
]

export function Content() {
  const [todosStore] = Todos.useUseState()
  const todosState = Todos.useStore()
  const isTransitioning = Todos.useTransition(["increment"])

  const transitions = useSyncExternalStore(
    cb => todosStore.transitions.subscribe(cb),
    () => todosStore.transitions.state.transitions
  )

  return (
    <div className="flex gap-4">
      <pre className="flex-1">{JSON.stringify({ transitions }, null, 2)}</pre>
      <div className="flex flex-col flex-1">
        <button
          onClick={() => {
            todosStore.dispatch({ type: "increment", transition: ["increment"] })
          }}
        >
          Increment
        </button>
        <button
          onClick={() => {
            todosStore.dispatch({ type: "increment-ten", transition: ["increment", "ten"] })
          }}
        >
          Increment (10)
        </button>
        <button
          onClick={() => {
            todosStore.dispatch({ type: "increment-three", transition: ["increment", "three"] })
          }}
        >
          Increment (3)
        </button>
        <button
          onClick={() => {
            todosStore.dispatch({ type: "decrement" })
          }}
        >
          Decrement
        </button>
      </div>
      <div className="flex flex-1">
        <div
          className={cn("size-10 ", {
            "bg-red-500": isTransitioning === true,
            "bg-emerald-500": isTransitioning === false,
          })}
        />

        <div className="flex flex-col">
          <div>
            <strong>Count: </strong>
            <span>{todosState.count}</span>
          </div>
          {display.map(display => (
            <DisplayTransition
              key={display.name}
              {...display}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type DisplayTransitionProps = (typeof display)[number]

export function DisplayTransition({ name, transition }: DisplayTransitionProps) {
  const isTransitioning = Todos.useTransition(transition)
  return (
    <div className="flex gap-2">
      <strong>{name}</strong>
      {isTransitioning && <Spinner size={14} />}
    </div>
  )
}
