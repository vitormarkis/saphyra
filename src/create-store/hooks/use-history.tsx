import { useEffect } from "react"
import { EventsTuple } from "~/create-store/event-emitter"
import {
  BaseAction,
  StateContext,
  DefaultActions,
  SomeStore,
} from "~/create-store/types"

type Eventable = {
  addEventListener(type: string, listener: (event: KeyboardEvent) => void): void
  removeEventListener(
    type: string,
    listener: (event: KeyboardEvent) => void
  ): void
}

export function useHistory<
  TState = StateContext,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
>(
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState>,
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
