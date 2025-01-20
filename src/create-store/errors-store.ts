import { Subject } from "~/Subject"

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
    this.state = { ...this.state, ...newState }
    this.notify()
  }
}
