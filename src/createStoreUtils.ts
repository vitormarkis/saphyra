import { createContext, useContext, useEffect, useSyncExternalStore } from "react"
import { GenericStore, TransitionsExtension } from "./create-store/types"
import { StoreConstructorConfig } from "./create-store"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TInitialProps = any,
  TStoreFactory extends (
    initialProps: TInitialProps,
    config?: StoreConstructorConfig
  ) => GenericStore<any, any> & TransitionsExtension = (
    initialProps: TInitialProps,
    config?: StoreConstructorConfig
  ) => GenericStore<any, any> & TransitionsExtension
>(store?: ReturnType<TStoreFactory>) {
  type TStore = ReturnType<TStoreFactory>
  const Context = createContext<[TStore, React.Dispatch<React.SetStateAction<TStore>>] | null>(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  const getDefaultStore = store ? () => store : () => useUseState()[0]

  function useStore<R = TStore["state"]>(selector?: (data: TStore["state"]) => R, store = getDefaultStore()) {
    const finalSelector = selector ?? (defaultSelector as (data: TStore["state"]) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => finalSelector(store.state)
    )
  }

  function useTransition(transition: any[], store = getDefaultStore()): boolean {
    return useSyncExternalStore(
      cb => store.transitions.subscribe(cb),
      () => store.transitions.get(transition) > 0
    )
  }

  function useErrorHandlers(handler: (error: unknown) => void, store = getDefaultStore()) {
    useEffect(() => {
      const unsub = store.registerErrorHandler(handler)
      return () => void unsub()
    }, [store])
  }

  return {
    Provider: Context.Provider,
    useStore,
    useUseState,
    useTransition,
    useErrorHandlers,
  }
}
