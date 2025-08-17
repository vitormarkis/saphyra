import { Subject } from "~/Subject"
import { mergeObj } from "./helpers/obj-descriptors"
import { deleteImmutably } from "./helpers/delete-immutably"

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

  delete(key: string) {
    const newState = deleteImmutably(this.state, key)
    this.setState(newState)
  }

  setState(newState: Partial<ErrorsState>) {
    this.state = mergeObj(this.state, newState)
    this.notify()
  }
}
