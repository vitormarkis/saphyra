import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { createStoreUtils } from "./createStoreUtils"
import { Subject } from "./Subject"
import { TransitionsStore } from "./TransitionsStore"
import { createAsync } from "./createAsync"
import { createDiffOnKeyChange } from "./diff"
import { sleep } from "./sleep"
import { cn } from "./lib/utils"

const PERMISSIONS = () => ({
  admin: ["all:all"],
  user: ["posts:read", "posts:write"],
})

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

type SelectedRole = "user" | "admin"

export namespace NSTodos {
  export type Actions = Events.Union
  export namespace Events {
    export type Union = Base & ChangeRole

    export type Base = {
      transition: any[]
    }

    export type ChangeRole = {
      type: "change-role"
      role: SelectedRole
    }
  }
}

type TranscationStoreProps = {}

type TransactionState = {
  role: "user" | "admin"
  permissions: string[]
  currentTransition: any[] | null
}

export class TranscationStore extends Store<TransactionState, NSTodos.Actions> {
  state: TransactionState
  stateMiddleware: (state: TransactionState, action?: NSTodos.Actions) => TransactionState
  transitions: TransitionsStore

  constructor({}: TranscationStoreProps) {
    super()
    this.stateMiddleware = stateMiddleware.bind(this)
    this.transitions = new TransitionsStore()

    this.state = {
      role: "user",
      permissions: PERMISSIONS()["user"],
      currentTransition: null,
    }
  }
}

function stateMiddleware(
  this: TranscationStore,
  intendedState: TransactionState,
  action?: NSTodos.Actions
): TransactionState {
  const state = { ...intendedState }

  // if (action?.transition && !Object.is(state.currentTransition, action?.transition)) {
  if (action?.transition) {
    state.currentTransition = action.transition
    const store = this
    const async = createAsync(this.transitions, state.currentTransition)
    this.transitions.events.done.once(action.transition.join(":"), () => {
      async.timer(() => {
        store.setStatePartial({ currentTransition: null })
        // isso gera um render a mais do que o necessario.
        // é possivel que em outra branch eu ja tenha resolvido isso
      })
    })
  }

  const [, diff] = createDiffOnKeyChange(this.state, state)

  const async = createAsync(this.transitions, state.currentTransition)

  if (action?.type === "change-role") {
    async.promise(sleep(1000, "fetching role"), () => {
      this.setStatePartial({ role: action.role })
    })
  }

  if (diff(["role"])) {
    async.promise(sleep(1000, "fetching permissions"), () => {
      this.setStatePartial({ permissions: PERMISSIONS()[state.role] })
    })
  }

  // if (!this.transitions.isHappening(state.currentTransition)) {
  //   state.currentTransition = null
  // }

  return state
}

export const [TransactionsContext, useTranscationStore, useTransactionUseState] =
  createStoreUtils<TranscationStore, TransactionState>()

export default function App() {
  const storeState = useState(() => new TranscationStore({}))
  const [store] = storeState

  useEffect(() => {
    Object.assign(window, { store })
  }, [])

  return (
    <TransactionsContext.Provider value={storeState}>
      <Content />
    </TransactionsContext.Provider>
  )
}

type ContentProps = {}

function useTransactionTransitions(key: any[]) {
  const [store] = useTransactionUseState()
  return useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.get(key) > 0
  )
}

export function Content({}: ContentProps) {
  const [store] = useTransactionUseState()
  const isChangingRole = useTransactionTransitions(["auth", "role"])
  const state = useTranscationStore(s => s)
  const { currentTransition, ...displayState } = state

  return (
    <div className="">
      <select
        name=""
        id=""
        onChange={e => {
          const selectedRole = e.target.value as "user" | "admin"
          store.dispatch({
            type: "change-role",
            role: selectedRole,
            transition: ["auth", "role"],
          })
        }}
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <pre className={cn(isChangingRole && "opacity-30")}>
        {JSON.stringify(displayState, null, 2)}
      </pre>
    </div>
  )
}
