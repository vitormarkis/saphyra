import { Subject } from "~/Subject"
import { cloneObj, mergeObj } from "./helpers/obj-descriptors"
import { SetterOrPartialState, Transition } from "./types"
import { ensureSetter } from "./helpers/utils"
import { deleteImmutably } from "./helpers/delete-immutably"

type TransitionsStateState<TState> = Record<string, TState | null>

export class TransitionsStateStore<TState> extends Subject {
  state: TransitionsStateState<TState>
  prevState: TransitionsStateState<TState>

  constructor() {
    super()
    this.state = {}
    this.prevState = {}
  }

  delete(key: string) {
    this.state = deleteImmutably(this.state, key)
    this.prevState = deleteImmutably(this.prevState, key)
    this.notify()
  }

  setState(
    setterOrPartialState: SetterOrPartialState<TransitionsStateState<TState>>
  ) {
    const setter = ensureSetter(setterOrPartialState)
    const newPartialState = setter(this.state)
    this.prevState = cloneObj(this.state)
    this.state = mergeObj(this.state, newPartialState)
    this.notify()
  }

  get(transition: Transition) {
    return this.state[transition.join(":")]
  }
}
