import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react"
import type {
  StoreErrorHandler,
  StoreInstantiatorGeneric,
  TransitionFunctionOptions,
} from "saphyra"
import { exact } from "~/fn/common"

function defaultSelector<T>(data: T) {
  return data
}

export function createStoreUtils<
  TStoreInstantiator extends
    StoreInstantiatorGeneric = StoreInstantiatorGeneric,
  TStore extends
    ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>,
>(store?: TStore) {
  type TState = TStore["state"]

  const Context = createContext<
    [TStore, React.Dispatch<React.SetStateAction<TStore>>] | null
  >(null)

  function useUseState() {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`[Context] No context provided.`)
    return ctx
  }

  const getDefaultStore: () => TStore = store
    ? () => store
    : () => useUseState()[0]

  function useTransition(
    transition: any[],
    store = getDefaultStore()
  ): boolean {
    return useSyncExternalStore(
      cb => store.transitions.subscribe(cb),
      () => store.transitions.get(transition) > 0,
      () => store.transitions.get(transition) > 0
    )
  }

  function useErrorHandlers(
    handler: StoreErrorHandler,
    store = getDefaultStore()
  ) {
    useEffect(() => {
      const unsub = store.registerErrorHandler(handler)
      return () => void unsub()
    }, [store])
  }

  function createUseStore(getStoreState: (store: TStore) => TState) {
    return function useStore<R = TState>(
      selector?: (data: TState) => R,
      store = getDefaultStore()
    ) {
      const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
      return useSyncExternalStore(
        cb => store.subscribe(cb),
        () => finalSelector(getStoreState(store)),
        () => finalSelector(getStoreState(store))
      )
    }
  }

  const useStore = createUseStore(store => store.getState())
  const useOptimisticStore = createUseStore(store => store.getOptimisticState())
  function useTransitionState<R = TState>(
    transition: any[],
    selector?: (data: TState) => R,
    store = getDefaultStore()
  ) {
    const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => {
        const state =
          store.transitionsState.state[transition.join(":")] ?? store.getState()
        return finalSelector(state)
      },
      () => {
        const state =
          store.transitionsState.state[transition.join(":")] ?? store.getState()
        return finalSelector(state)
      }
    )
  }

  function useLazyValue<TTransition extends any[], TPromiseResult, R = TState>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) {
    const hasFetched = useRef(false)
    const store = getDefaultStore()

    const watchValue = useStore(options.select, store)
    const isLoading = useTransition(options.transition, store)

    useEffect(() => {
      if (hasFetched.current) return
      if (watchValue !== undefined || isLoading) return
      if (store.transitions.get(options.transition) > 0) {
        throw new Error(
          "Error! Would've dispatched a transition that is already running."
        )
      }
      store.dispatch({
        type: "$$lazy-value",
        transition: options.transition,
        transitionFn: options.transitionFn,
        onSuccess: options.onSuccess,
      })
      hasFetched.current = true
    }, [watchValue, isLoading])

    return watchValue !== undefined
      ? exact([watchValue, false])
      : exact([undefined, true])
  }

  const utils: StoreUtils<TState, TStore> = {
    Provider: Context.Provider,
    useStore,
    useOptimisticStore,
    useUseState,
    useTransition,
    useErrorHandlers,
    useLazyValue,
    createLazyOptions: opts => opts,
    useTransitionState,
  }

  return utils
}

export interface LazyValueOptions<
  TState,
  TTransition extends any[],
  TPromiseResult,
  R,
> {
  transition: TTransition
  select: (state: TState) => R
  transitionFn: (options: TransitionFunctionOptions) => Promise<TPromiseResult>
  onSuccess?: (value: TPromiseResult) => void
}

export type StoreUtils<
  TState,
  TStore extends
    ReturnType<StoreInstantiatorGeneric> = ReturnType<StoreInstantiatorGeneric>,
> = {
  Provider: React.Provider<any>
  useStore: <R = TState>(selector?: (data: TState) => R, store?: TStore) => R
  useOptimisticStore: <R = TState>(
    selector?: (data: TState) => R,
    store?: TStore
  ) => R
  useUseState: () => [TStore, React.Dispatch<React.SetStateAction<TStore>>]
  useTransition: (transition: any[], store?: TStore) => boolean
  useErrorHandlers: (handler: StoreErrorHandler, store?: TStore) => void
  useLazyValue: <const TTransition extends any[], TPromiseResult, R>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) => [R, false] | [undefined, true]
  createLazyOptions: <const TTransition extends any[], TPromiseResult, R>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) => LazyValueOptions<TState, TTransition, TPromiseResult, R>
  useTransitionState: <R = TState>(
    transition: any[],
    selector?: (data: TState) => R,
    store?: TStore
  ) => R
}
