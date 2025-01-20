type ArgsTuple = any[]
export type EventsTuple = Record<string, ArgsTuple>
type EventHandler<T extends ArgsTuple> = (...args: T) => void
type EventHandlers<T extends ArgsTuple> = EventHandler<T>[]
type HandlersMapping<Events extends EventsTuple> = {
  [K in keyof Events]: EventHandlers<Events[K]>
}

export class EventEmitter<EventArgs extends EventsTuple = EventsTuple> {
  private handlers: Partial<HandlersMapping<EventArgs>> = {}

  on<TEventName extends keyof EventArgs>(
    event: TEventName,
    handler: EventHandler<EventArgs[TEventName]>
  ) {
    this.handlers[event] ??= []
    this.handlers[event]?.push(handler)
    return () => {
      this.handlers[event]?.splice(this.handlers[event].indexOf(handler), 1)
      function noop() {}
      noop()
    }
  }

  once<TEventName extends keyof EventArgs>(
    event: TEventName,
    handler: EventHandler<EventArgs[TEventName]>
  ) {
    const off = this.on(event, (...args) => {
      off()
      handler(...args)
    })

    return off
  }

  emit<TEventName extends keyof EventArgs>(
    event: TEventName,
    ...args: EventArgs[TEventName]
  ) {
    const handlers = this.handlers[event]
    if (!handlers) return
    for (const handler of handlers) {
      handler(...args)
    }
  }

  clear<TEventName extends keyof EventArgs>(event: TEventName) {
    this.handlers[event] = []
  }
}
