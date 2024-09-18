import { Reducer, useEffect, useReducer } from "react"
import { toast } from "sonner"
import { cn } from "./lib/utils"
import { Button } from "./Button"

type Action_LoggedIn = { type: "logout" }
type Action_NoSession = { type: "login" }
type Action = Action_LoggedIn | Action_NoSession

type State = {
  state: "logged-in" | "no-session"
  handler: Record<string, Reducer<State, any>>
}

const handlers = {
  "logged-in": {
    logout: (prevState: State, action: Action_LoggedIn) => {
      prevState.state = "no-session"
      return prevState
    },
  },
  "no-session": {
    login: (prevState: State, action: Action_NoSession) => {
      prevState.state = "logged-in"
      return prevState
    },
  },
} satisfies Record<State["state"], Record<string, Reducer<State, any>>>

const reducer: Reducer<State, Action> = (currState, action) => {
  let state = { ...currState }
  if (!state.handler[action.type]) {
    toast(`Unknown action [${action.type}]`)
    return currState
  }
  state = state.handler[action.type]({ ...state }, action)

  state.handler = handlers[state.state]
  return state
}

const initialState: State = {
  state: "no-session",
  handler: handlers["no-session"],
}

function App() {
  const [store, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    console.log(store)
    Object.assign(window, { store })
  }, [store])

  return (
    <>
      {"logout" in store.handler && (
        <Button onClick={() => dispatch({ type: "logout" })}>Logout</Button>
      )}
      {"login" in store.handler && (
        <Button onClick={() => dispatch({ type: "login" })}>Login</Button>
      )}
      <p className={cn("", store.state !== "logged-in" && "opacity-30")}>Logged in</p>
      <p className={cn("", store.state !== "no-session" && "opacity-30")}>No session</p>
    </>
  )
}

export default App
