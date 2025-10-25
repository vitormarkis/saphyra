import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react"
import type {
  SomeStoreGeneric,
  StoreErrorHandler,
  StoreInstantiatorGeneric,
  Transition,
  TransitionFunctionOptions,
} from "saphyra"
import { exact } from "~/fn/common"
import { NewStoreReturn } from "./types"

function defaultSelector<T>(data: T) {
  return data
}

export type LazyValueOptions<
  TState,
  TTransition extends any[],
  TPromiseResult,
  R = TState,
> = {
  select: (state: TState) => R
  transition: TTransition
  transitionFn: (options: TransitionFunctionOptions) => Promise<TPromiseResult>
  onSuccess: (value: TPromiseResult) => void
}

export function createStoreUtils<
  TStoreInstantiator extends
    StoreInstantiatorGeneric = StoreInstantiatorGeneric,
  TStore extends
    ReturnType<TStoreInstantiator> = ReturnType<TStoreInstantiator>,
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

  function useErrorHandlers(
    handler: StoreErrorHandler,
    store = getDefaultStore()
  ) {
    useEffect(() => {
      const unsub = store.registerErrorHandler(handler)
      return () => void unsub()
    }, [store])
  }

  function createuseCommittedSelector(
    getStoreState: (store: TStore) => TState
  ) {
    return function useCommittedSelector<R = TState>(
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

  const useCommittedSelector = createuseCommittedSelector(store =>
    store.getState()
  )
  const useSelector = createuseCommittedSelector(store =>
    store.getOptimisticState()
  )
  function useTransitionSelector<R = TState>(
    transition: Transition,
    selector?: (data: TState) => R,
    store = getDefaultStore()
  ) {
    const finalSelector = selector ?? (defaultSelector as (data: TState) => R)
    return useSyncExternalStore(
      cb => store.subscribe(cb),
      () => {
        const state = getTransitionState(transition, store)
        // For transition states, we need to inject cached getters manually
        const stateWithGetters = (store as any).derivationsRegistry
          ? (store as any).derivationsRegistry.injectCachedGetters(
              state,
              `transition:${transition.join(":")}`
            )
          : state
        return finalSelector(stateWithGetters)
      },
      () => {
        const state = getTransitionState(transition, store)
        // For transition states, we need to inject cached getters manually
        const stateWithGetters = (store as any).derivationsRegistry
          ? (store as any).derivationsRegistry.injectCachedGetters(
              state,
              `transition:${transition.join(":")}`
            )
          : state
        return finalSelector(stateWithGetters)
      }
    )
  }

  function useLazyValue<TTransition extends any[], TPromiseResult, R = TState>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) {
    const hasFetched = useRef(false)
    const store = getDefaultStore()

    const watchValue = useCommittedSelector(options.select, store)
    const isLoading = useTransition(options.transition, store)

    useEffect(() => {
      if (hasFetched.current) return
      if (watchValue !== undefined || isLoading) return
      if (store.transitions.isHappening(options.transition)) {
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

  function useStoreDiff<
    TState,
    const TSelectors extends ((state: TState) => any)[],
  >(props: UseStoreDiffProps<TState, TSelectors>, store = getDefaultStore()) {
    return useStoreDiffImpl<TState, TSelectors>(
      props,
      () => store.getOptimisticState(),
      store
    )
  }

  function useCommittedStoreDiff<
    TState,
    const TSelectors extends ((state: TState) => any)[],
  >(props: UseStoreDiffProps<TState, TSelectors>, store = getDefaultStore()) {
    return useStoreDiffImpl<TState, TSelectors>(
      props,
      () => store.getState(),
      store
    )
  }

  function useTransitionStoreDiff<
    TState,
    const TSelectors extends ((state: TState) => any)[],
  >(
    transition: Transition,
    props: UseStoreDiffProps<TState, TSelectors>,
    store = getDefaultStore()
  ) {
    return useStoreDiffImpl<TState, TSelectors>(
      props,
      () => getTransitionState(transition, store),
      store
    )
  }

  function useStoreDiffImpl<
    TState,
    const TSelectors extends ((state: TState) => any)[],
  >(
    { on: selectors, run: callback }: UseStoreDiffProps<TState, TSelectors>,
    getState: () => TState,
    store = getDefaultStore()
  ) {
    const prevValuesRef = useRef<any[]>([])

    useEffect(() => {
      const handler = () => {
        const currentValues = selectors.map(selector => selector(getState()))
        if (
          currentValues.every(
            (value, index) => value === prevValuesRef.current[index]
          )
        ) {
          return
        }
        prevValuesRef.current = currentValues
        callback(...(currentValues as SelectorValues<TState, TSelectors>))
      }
      return store.subscribe(handler)
    }, [store])
  }

  const utils: StoreUtils<TState, TStore> = {
    Context,
    useSelector,
    useStoreDiff,
    useCommittedSelector,
    useCommittedStoreDiff,
    useTransitionSelector,
    useTransitionStoreDiff,
    useStore,
    useTransition,
    useErrorHandlers,
    useLazyValue,
    createLazyOptions: opts => opts,
  }

  return utils
}

export type StoreUtils<
  TState,
  TStore extends
    ReturnType<StoreInstantiatorGeneric> = ReturnType<StoreInstantiatorGeneric>,
> = {
  Context: React.Context<NewStoreReturn<TStore> | null>
  useSelector: <R = TState>(selector?: (data: TState) => R, store?: TStore) => R
  useCommittedSelector: <R = TState>(
    selector?: (data: TState) => R,
    store?: TStore
  ) => R
  useTransitionSelector: <R = TState>(
    transition: Transition,
    selector?: (data: TState) => R,
    store?: TStore
  ) => R
  useStore: () => NewStoreReturn<TStore>
  useTransition: (transition: Transition, store?: TStore) => boolean
  useErrorHandlers: (handler: StoreErrorHandler, store?: TStore) => void
  useLazyValue: <const TTransition extends any[], TPromiseResult, R>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) => [R, false] | [undefined, true]
  useStoreDiff<const TSelectors extends ((state: TState) => any)[]>(
    props: UseStoreDiffProps<TState, TSelectors>,
    store?: TStore
  ): void
  useCommittedStoreDiff<const TSelectors extends ((state: TState) => any)[]>(
    props: UseStoreDiffProps<TState, TSelectors>,
    store?: TStore
  ): void
  useTransitionStoreDiff<const TSelectors extends ((state: TState) => any)[]>(
    transition: Transition,
    props: UseStoreDiffProps<TState, TSelectors>,
    store?: TStore
  ): void
  createLazyOptions: <const TTransition extends any[], TPromiseResult, R>(
    options: LazyValueOptions<TState, TTransition, TPromiseResult, R>
  ) => LazyValueOptions<TState, TTransition, TPromiseResult, R>
}

type SelectorValues<TState, T extends readonly ((state: TState) => any)[]> = {
  [K in keyof T]: ReturnType<T[K]>
}

type UseStoreDiffProps<
  TState,
  TSelectors extends readonly ((state: TState) => any)[],
> = {
  on: TSelectors
  run: (...args: SelectorValues<TState, TSelectors>) => void
}

function getTransitionState<
  TStore extends SomeStoreGeneric,
  TState extends TStore["state"],
>(transition: Transition, store: TStore): TState {
  return (
    store.transitionsState.state[transition.join(":")] ??
    store.getOptimisticState()
  )
}
