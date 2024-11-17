import { useEffect, useState } from "react"
import { createStoreUtils } from "./createStoreUtils"
import { Subject } from "./Subject"
import { TransitionsStore } from "./TransitionsStore"

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
    export type Union = Base & {}

    export type Base = {
      transition: any[]
    }
  }
}

type TranscationStoreProps = {}

type TransactionState = {
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

  if (action?.transition) {
    state.currentTransition = action.transition
  }

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

export function Content({}: ContentProps) {
  const [store] = useTransactionUseState()
  const state = useTranscationStore(s => s)

  return (
    <div className="bg-black text-white cursor-default select-none min-h-screen">
      <pre>{JSON.stringify({ state }, null, 2)}</pre>
    </div>
  )
}
