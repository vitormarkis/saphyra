import { EventEmitter } from "~/create-store/event-emitter"
import { noop } from "~/create-store/fn/noop"
import { TransitionsStore } from "~/create-store/transitions-store"

export type ITransitionsStoreEvents = Omit<TransitionsStore, "once"> & {
  once(transition: any[] | null | undefined | string): {
    run(handler: () => void): () => void
  }
}

export class TransitionsStoreEvents extends EventEmitter {
  once(transition: any[] | string) {
    const transitionName = typeof transition === "string" ? transition : transition.join(":")
    const events = this

    return {
      run(handler: (...args: any[]) => void) {
        const off = events.on(transitionName, (...args) => {
          off()
          handler(...args)
        })

        return off
      },
    }
  }
}
