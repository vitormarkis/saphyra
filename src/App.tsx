import { useEffect, useState, useSyncExternalStore } from "react"
import { createAsync } from "./createAsync"
import { createStoreUtils } from "./createStoreUtils"
import { createDiffOnKeyChange } from "./diff"
import { cn } from "./lib/utils"
import { sleep } from "./sleep"
import { Subject } from "./Subject"
import { TransitionsStore } from "./TransitionsStore"
import { SelectedRole } from "./types"
import { PERMISSIONS } from "./consts"
import { getPermissions } from "./getPermissions"
import { Spinner } from "@blueprintjs/core"
import { fetchRole } from "./fetchRole"

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
    export type Union = Base & (ChangeRole | FinishTransition)

    export type Base = {
      transition: any[] | null
    }

    export type ChangeRole = {
      type: "change-role"
      role: SelectedRole
    }

    export type FinishTransition = {
      type: "finish-transition"
      error: unknown | null
    }
  }
}

type TranscationStoreProps = {}

type TransactionState = {
  role: "user" | "admin"
  permissions: string[]
  currentTransition: any[] | null
  currentTransitionState: TransactionState | null
  transitionError: unknown | null
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
      currentTransitionState: null,
      transitionError: null,
    }
  }

  rollbackState(state: TransactionState | null, error: any) {
    if (!state) return
    this.state = {
      ...state,
      currentTransition: null,
      currentTransitionState: null,
      transitionError: "message" in error ? error.message : error,
    }
    this.notify()
  }
}

type TransitionBoilerplateProps = {
  store: TranscationStore
  state: TransactionState
  action?: NSTodos.Actions
  rollbackState: (error: unknown) => void
}

export function transitionBoilerplate({ store, state, action, rollbackState }: TransitionBoilerplateProps) {
  if (action?.transition) {
    state.currentTransition = action.transition
    state.currentTransitionState = store.state
    const async = createAsync(store.transitions, state.currentTransition, rollbackState)
    store.transitions.events.done.once(action.transition.join(":"), error => {
      async.timer(() => {
        if (store.state.currentTransition) {
          console.log(
            `%cTransition completed! [${store.state.currentTransition.join(":")}]`,
            "color: lightgreen"
          )
        }
        store.dispatch({ type: "finish-transition", transition: null, error })

        // isso gera um render a mais do que o necessario.
        // é possivel que em outra branch eu ja tenha resolvido isso
      })
    })
  }

  if (action?.type === "finish-transition") {
    state.currentTransition = null
    state.currentTransitionState = null
    state.transitionError = getMessage(action.error) ?? null
  }

  return
}

function stateMiddleware(
  this: TranscationStore,
  intendedState: TransactionState,
  action?: NSTodos.Actions
): TransactionState {
  const state = { ...intendedState }

  const rollbackState = (error: unknown) => {
    setTimeout(() => {
      this.rollbackState(state.currentTransitionState, error)
      this.notify()
    })
  }

  transitionBoilerplate({
    action,
    state,
    store: this,
    rollbackState,
  })

  const [, diff] = createDiffOnKeyChange(this.state, state)

  const async = createAsync(this.transitions, state.currentTransition, rollbackState)

  if (action?.type === "change-role") {
    async.promise(fetchRole({ roleName: action.role }), role => {
      this.setStatePartial({ role })
    })
  }

  if (diff(["role"])) {
    async.promise(getPermissions({ role: state.role }), permissions => {
      this.setStatePartial({ permissions })
    })
  }

  return state
}

export const [TransactionsContext, useTranscationStore, useTransactionUseState] = createStoreUtils<
  TranscationStore,
  TransactionState
>()

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

export function Content({}: ContentProps) {
  const [store] = useTransactionUseState()
  const isChangingRole = useTransactionTransitions(["auth", "role"])
  const state = useTranscationStore(s => s)
  const { currentTransition, currentTransitionState, ...displayState } = state

  return (
    <div className="">
      <div className="flex items-center gap-2">
        <select
          name=""
          id=""
          value={state.role}
          disabled={isChangingRole}
          className={cn("disabled:opacity-30 disabled:cursor-not-allowed", isChangingRole && "opacity-30")}
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
        {isChangingRole ? <Spinner size={16} /> : null}
      </div>

      <pre className={cn("disabled:opacity-30 disabled:cursor-not-allowed", isChangingRole && "opacity-30")}>
        {JSON.stringify(displayState, null, 2)}
      </pre>
    </div>
  )
}

function getMessage(error: unknown) {
  if (!error) return null
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  return null
}

function useTransactionTransitions(key: any[]) {
  const [store] = useTransactionUseState()
  return useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.get(key) > 0
  )
}
