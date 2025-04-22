import { EventEmitter, EventsTuple } from "../event-emitter"

export const mockEventEmitter = <
  TEvents extends EventsTuple = EventsTuple,
>(): EventEmitter<TEvents> => {
  return {
    clear() {},
    emit() {},
    on() {
      return () => {}
    },
    once() {
      return {
        run() {
          return () => {}
        },
      }
    },
    handlers: {},
  }
}
