import { Subject } from "~/Subject"
import { cloneObj, mergeObj } from "./helpers/obj-descriptors"
import { SetterOrPartialState } from "./types"
import { ensureSetter } from "./helpers/utils"

type TransitionsStateState<TState> = Record<string, TState | null>

export class TransitionsStateStore<TState> extends Subject {
  state: TransitionsStateState<TState>
  prevState: TransitionsStateState<TState>

  constructor() {
    super()
    this.state = {}
    this.prevState = {}
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
}
