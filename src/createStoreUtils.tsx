import { createContext, memo, ReactNode, useContext, useEffect, useSyncExternalStore } from "react"
import { BaseState, StoreErrorHandler, StoreInstantiatorGeneric } from "./create-store/types"
import { Devtools, DevtoolsPropsWithoutStore } from "./devtools/devtools"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TStoreInstantiator extends StoreInstantiatorGeneric = StoreInstantiatorGeneric,
  TStore extends ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>
>(store?: TStore) {
  type TState = TStore["state"]

  const Context = createContext<[TStore, React.Dispatch<React.SetStateAction<TStore>>] | null>(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  const getDefaultStore: () => TStore = store ? () => store : () => useUseState()[0]

  function useTransition(transition: any[], store = getDefaultStore()): boolean {
    return useSyncExternalStore(
      cb => store.transitions.subscribe(cb),
      () => store.transitions.get(transition) > 0
    )
  }

  function useErrorHandlers(handler: StoreErrorHandler, store = getDefaultStore()) {
    useEffect(() => {
      const unsub = store.registerErrorHandler(handler)
      return () => void unsub()
    }, [store])
  }

  function useStore<R = TState>(selector?: (data: TState) => R, store = getDefaultStore()) {
    const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => finalSelector(store.getState())
    )
  }

  const LocalDevtools = memo(<T,>(props: DevtoolsPropsWithoutStore<T>) => {
    return (
      <Devtools
        store={getDefaultStore()}
        {...props}
      />
    )
  })

  const utils: StoreUtils<TState, TStore> = {
    Provider: Context.Provider,
    Devtools: LocalDevtools,
    useStore,
    useUseState,
    useTransition,
    useErrorHandlers,
  }

  return utils
}

export type StoreUtils<
  TState extends BaseState,
  TStore extends ReturnType<StoreInstantiatorGeneric> = ReturnType<StoreInstantiatorGeneric>
> = {
  Provider: React.Provider<any>
  Devtools: React.MemoExoticComponent<<T>(props: DevtoolsPropsWithoutStore<T>) => ReactNode>
  useStore: <R = TState>(selector?: (data: TState) => R, store?: TStore) => R
  useUseState: () => [TStore, React.Dispatch<React.SetStateAction<TStore>>]
  useTransition: (transition: any[], store?: TStore) => boolean
  useErrorHandlers: (handler: StoreErrorHandler, store?: TStore) => void
}
