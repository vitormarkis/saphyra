import { Subject } from "~/Subject"
import { mergeObj } from "./helpers/obj-descriptors"

type ErrorsState = {
  bootstrap: unknown | null
}

export class ErrorsStore extends Subject {
  state: ErrorsState

  constructor() {
    super()
    this.state = {
      bootstrap: null,
    }
  }

  setState(newState: Partial<ErrorsState>) {
    this.state = mergeObj(this.state, newState)
    this.notify()
  }
}
