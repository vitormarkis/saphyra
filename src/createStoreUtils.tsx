import { createContext, memo, ReactNode, useContext, useEffect, useSyncExternalStore } from "react"
import {
  BaseAction,
  BaseState,
  DefaultActions,
  GenericStore,
  StoreInstantiator,
  TransitionsExtension,
} from "./create-store/types"
import { Devtools, DevtoolsPropsWithoutStore } from "./devtools/devtools"
import { ExternalProps } from "~/create-store"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TStoreInstantiator extends StoreInstantiator<
    any,
    GenericStore<any, any> & TransitionsExtension
  > = StoreInstantiator<any, GenericStore<any, any> & TransitionsExtension>,
  TStore extends ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>
>(store?: TStore): StoreUtils<TStore["state"], ExtractActions<TStore>, TStore["__externalProps"]> {
  type TState = TStore["state"]
  type TActions = ExtractActions<TStore>
  type TExternalProps = TStore["__externalProps"]
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
      () => finalSelector(store.getState())
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

  const LocalDevtools = memo(<T,>(props: DevtoolsPropsWithoutStore<T>) => {
    return (
      <Devtools
        store={getDefaultStore()}
        {...props}
      />
    )
  })

  return {
    Provider: Context.Provider,
    Devtools: LocalDevtools,
    useStore,
    useUseState,
    useTransition,
    useErrorHandlers,
  } as unknown as StoreUtils<TState, TActions, TExternalProps>
}

export type StoreUtils<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TExternalProps extends ExternalProps = ExternalProps
> = {
  Provider: React.Provider<any>
  Devtools: React.MemoExoticComponent<<T>(props: DevtoolsPropsWithoutStore<T>) => ReactNode>
  useStore: <R = TState & TExternalProps>(
    selector?: (data: TState & TExternalProps) => R,
    store?: GenericStore<TState & TExternalProps, TActions> & TransitionsExtension
  ) => R
  useUseState: () => [
    GenericStore<TState & TExternalProps, TActions> & TransitionsExtension,
    (store: GenericStore<TState & TExternalProps, TActions> & TransitionsExtension) => void
  ]
  useTransition: (
    transition: any[],
    store?: GenericStore<TState & TExternalProps, TActions> & TransitionsExtension
  ) => boolean
  useErrorHandlers: (
    handler: (error: unknown) => void,
    store?: GenericStore<TState & TExternalProps, TActions>
  ) => void
}

export type ExtractActions<TStore extends GenericStore<any, any> & TransitionsExtension> = Parameters<
  TStore["dispatch"]
>[0]
