import { noop } from "~/create-store/fn/noop"

type ArgsTuple = any[]
export type EventsTuple = Record<string, ArgsTuple>
type EventHandler<T extends ArgsTuple> = (...args: T) => void
type EventHandlers<T extends ArgsTuple> = Set<EventHandler<T>>
type HandlersMapping<Events extends EventsTuple> = {
  [K in keyof Events]: EventHandlers<Events[K]>
}

export class EventEmitter<EventArgs extends EventsTuple = EventsTuple> {
  protected handlers: Partial<HandlersMapping<EventArgs>> = {}

  on<TEventName extends keyof EventArgs>(
    event: TEventName,
    handler: EventHandler<EventArgs[TEventName]>
  ) {
    this.handlers[event] ??= new Set()
    this.handlers[event].add(handler)
    return () => {
      this.handlers[event]?.delete(handler)
    }
  }

  once<TEventName extends keyof EventArgs>(event: TEventName) {
    let __handler = noop
    const off = this.on(event, (...args) => {
      off()
      __handler(...args)
    })

    return {
      run(handler: EventHandler<EventArgs[TEventName]>) {
        __handler = handler
        return off
      },
    }
  }

  emit<TEventName extends keyof EventArgs>(event: TEventName, ...args: EventArgs[TEventName]) {
    const handlers = this.handlers[event]
    if (!handlers) return
    for (const handler of handlers) {
      handler(...args)
    }
  }
}
