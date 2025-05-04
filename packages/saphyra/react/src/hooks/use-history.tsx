import { useEffect } from "react"
import type { ActionShape, EventsTuple, SomeStore } from "saphyra"

type Eventable = {
  addEventListener(type: string, listener: (event: KeyboardEvent) => void): void
  removeEventListener(
    type: string,
    listener: (event: KeyboardEvent) => void
  ): void
}

export function useHistory<
  TState extends Record<string, any> = any,
  TActions extends ActionShape<TState, TEvents> = ActionShape<TState, any>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>,
  el: Eventable = document
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "z" && event.ctrlKey) {
        event.preventDefault()
        store.undo()
      }

      if (event.key === "y" && event.ctrlKey) {
        event.preventDefault()
        store.redo()
      }
    }

    el.addEventListener("keydown", handleKeyDown)
    return () => {
      el.removeEventListener("keydown", handleKeyDown)
    }
  }, [store])
}
