import { createContext, useContext, useEffect, useSyncExternalStore } from "react"
import {
  BaseAction,
  BaseState,
  DefaultActions,
  GenericStore,
  StoreInstantiator,
  TransitionsExtension,
} from "./create-store/types"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TStoreInstantiator extends StoreInstantiator<
    any,
    GenericStore<any, any> & TransitionsExtension
  > = StoreInstantiator<any, GenericStore<any, any> & TransitionsExtension>,
  TStore extends ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>
>(store?: TStore): StoreUtils<TStore["state"], ExtractActions<TStore>> {
  type TState = TStore["state"]
  type TActions = ExtractActions<TStore>
  // type TStore = GenericStore<TState, TActions> & TransitionsExtension
  const Context = createContext<[TStore, React.Dispatch<React.SetStateAction<TStore>>] | null>(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  const getDefaultStore = store ? () => store : () => useUseState()[0]

  function useStore<R = TState>(selector?: (data: TState) => R, store = getDefaultStore()) {
    const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
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
  } as unknown as StoreUtils<TState, TActions>
}

export type StoreUtils<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  Provider: React.Provider<any>
  useStore: <R = TState>(
    selector?: (data: TState) => R,
    store?: GenericStore<TState, TActions> & TransitionsExtension
  ) => R
  useUseState: () => [
    GenericStore<TState, TActions> & TransitionsExtension,
    (store: GenericStore<TState, TActions> & TransitionsExtension) => void
  ]
  useTransition: (transition: any[], store?: GenericStore<TState, TActions> & TransitionsExtension) => boolean
  useErrorHandlers: (handler: (error: unknown) => void, store?: GenericStore<TState, TActions>) => void
}

export type ExtractActions<TStore extends GenericStore<any, any> & TransitionsExtension> = Parameters<
  TStore["dispatch"]
>[0]
