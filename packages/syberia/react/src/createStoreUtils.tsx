import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react"
import type { Transition } from "../../src/transitions/transitions-store"
import { NewStoreReturn } from "./types"
import type { SyberiaStoreGeneric } from "./types"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TStoreInstantiator extends () => SyberiaStoreGeneric = () => SyberiaStoreGeneric,
  TStore extends ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>,
>(store?: TStore) {
  type TState = TStore["state"]
  const Context = createContext<NewStoreReturn<TStore> | null>(null)

  function useStore() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  const getDefaultStore: () => TStore = store
    ? () => store
    : () => useStore()[0]

  function useTransition(
    transition: Transition,
    store = getDefaultStore()
  ): boolean {
    return useSyncExternalStore(
      cb => store.transitions.subscribe(cb),
      () => store.transitions.isHappening(transition),
      () => store.transitions.isHappening(transition)
    )
  }

  function useSelector<R = TState>(
    selector?: (data: TState) => R,
    store = getDefaultStore()
  ) {
    const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => finalSelector(store.getState()),
      () => finalSelector(store.getState())
    )
  }

  const utils: StoreUtils<TState, TStore> = {
    Context,
    useSelector,
    useStore,
    useTransition,
  }

  return utils
}

export type StoreUtils<
  TState,
  TStore extends SyberiaStoreGeneric,
> = {
  Context: React.Context<NewStoreReturn<TStore> | null>
  useSelector: <R = TState>(selector?: (data: TState) => R, store?: TStore) => R
  useStore: () => NewStoreReturn<TStore>
  useTransition: (transition: Transition, store?: TStore) => boolean
}
