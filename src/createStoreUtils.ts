import { createContext, useContext, useSyncExternalStore } from "react"
import { GenericStore, TransitionsExtension } from "./create-store/types"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TInitialProps = any,
  TStoreFactory extends (initialProps: TInitialProps) => GenericStore<any, any> & TransitionsExtension = (
    initialProps: TInitialProps
  ) => GenericStore<any, any> & TransitionsExtension
>() {
  type TStore = ReturnType<TStoreFactory>
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

  function useTransition(transition: any[], store = useUseState()[0]): boolean {
    return useSyncExternalStore(
      cb => store.transitions.subscribe(cb),
      () => store.transitions.get(transition) > 0
    )
  }

  return {
    Provider: Context.Provider,
    useStore,
    useUseState,
    useTransition,
  }
}
