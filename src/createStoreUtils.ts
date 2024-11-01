import { createContext, useContext, useSyncExternalStore } from "react"
import { Store } from "./App"

export function createStoreUtils<TStore extends Store<any, any>, TStoreData>() {
  const Context = createContext<
    [TStore, React.Dispatch<React.SetStateAction<TStore>>] | null
  >(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  function useStore<R>(selector: (data: TStoreData) => R, store = useUseState()[0]) {
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => selector(store.state)
    )
  }

  return [Context, useStore, useUseState] as const
}
