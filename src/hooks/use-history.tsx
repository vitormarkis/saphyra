import { useEffect } from "react"
import {
  BaseAction,
  BaseState,
  DefaultActions,
  GenericStore,
  TransitionsExtension,
} from "~/create-store/types"

type Eventable = {
  addEventListener(type: string, listener: (event: KeyboardEvent) => void): void
  removeEventListener(type: string, listener: (event: KeyboardEvent) => void): void
}

export function useHistory<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
>(store: GenericStore<TState, TActions> & TransitionsExtension, el: Eventable = document) {
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
