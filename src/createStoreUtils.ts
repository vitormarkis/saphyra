import { createContext, useContext, useSyncExternalStore } from "react"
import { GenericStoreClass } from "./create-store/types"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<TStoreClass extends GenericStoreClass<any, any, any>>() {
  type TStore = InstanceType<TStoreClass>
  const Context = createContext<[TStore, React.Dispatch<React.SetStateAction<TStore>>] | null>(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  function useStore<R = TStore["state"]>(selector?: (data: TStore["state"]) => R, store = useUseState()[0]) {
    let finalSelector = selector ?? (defaultSelector as (data: TStore["state"]) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => finalSelector(store.state)
    )
  }

  return {
    Context,
    useStore,
    useUseState,
  }
}
