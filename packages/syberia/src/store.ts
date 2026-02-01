import { createSubject, type SubjectType } from "./subject"
import { TransitionsStore, type Transition } from "./transitions"
import { DerivedBuilder, type AnyDefinition } from "./derived/derived-builder"
import { DerivedEngine } from "./derived/derived-engine"

function normalizeDefinitions(items: any[]): AnyDefinition[] {
  const result: AnyDefinition[] = []
  
  for (const item of items) {
    if (!item) continue
    
    // If it's a DerivedBuilder, extract its definitions
    if (item instanceof DerivedBuilder || typeof item.getDefinitions === "function") {
      result.push(...normalizeDefinitions(item.getDefinitions()))
    }
    // If it's an array, recursively normalize
    else if (Array.isArray(item)) {
      result.push(...normalizeDefinitions(item))
    }
    // If it has 'kind' or 'type', it's a definition
    else if (item.kind === "from-each" || item.type) {
      result.push(item)
    }
  }
  
  return result
}

export type ActionShape = Record<string, any> & { type: string }

export type ReducerProps<TState, TActions extends ActionShape> = {
  state: TState
  action: TActions
  set: (setter: (state: TState) => TState) => void
}

export type Reducer<TState, TActions extends ActionShape> = (
  props: ReducerProps<TState, TActions>
) => TState

export type OnConstructProps<TInitialProps, TState> = {
  initialProps: TInitialProps
}

export type OnConstruct<TInitialProps, TState> = (
  props: OnConstructProps<TInitialProps, TState>
) => TState | Promise<TState>

export type DerivedConfigFn<TState> = (
  d: DerivedBuilder<TState>
) => any[]

export type StoreOptions<
  TInitialProps extends Record<string, any>,
  TState extends Record<string, any>,
  TActions extends ActionShape,
> = {
  onConstruct?: OnConstruct<TInitialProps, TState>
  reducer?: Reducer<TState, TActions>
  derived?: DerivedConfigFn<TState>
}

export type SyberiaStore<
  TState extends Record<string, any>,
  TActions extends ActionShape,
> = {
  state: TState
  transitions: TransitionsStore
  dispatch: (action: TActions & { transition?: Transition }) => void
  setState: (setter: (state: TState) => TState) => void
  getState: () => TState
  subscribe: (callback: () => void) => () => void
  dispose: () => void
}

export function newSyberiaStore<
  TInitialProps extends Record<string, any>,
  TState extends Record<string, any> = TInitialProps,
  TActions extends ActionShape = ActionShape,
>(
  options: StoreOptions<TInitialProps, TState, TActions> = {}
): (initialProps: TInitialProps) => SyberiaStore<TState, TActions> {
  const { reducer = (props) => props.state, derived } = options

  // Handle onConstruct with proper typing
  const onConstruct: OnConstruct<TInitialProps, TState> =
    options.onConstruct ?? ((props) => props.initialProps as unknown as TState)

  return function createStore(
    initialProps: TInitialProps
  ): SyberiaStore<TState, TActions> {
    const subject = createSubject()
    const transitionsStore = new TransitionsStore()

    let state: TState = onConstruct({ initialProps }) as TState
    let isProcessingDerived = false
    
    const setStateInternal = (setter: (state: TState) => TState) => {
      state = setter(state)
    }

    // Initialize derived engine
    let derivedEngine: DerivedEngine<TState> | null = null
    if (derived) {
      const builder = new DerivedBuilder<TState>()
      const rawDefinitions = derived(builder)
      // Normalize definitions - extract from builders if needed
      const definitions = normalizeDefinitions(rawDefinitions)
      derivedEngine = new DerivedEngine(definitions, transitionsStore)
      // Process derived values on initial state
      isProcessingDerived = true
      derivedEngine.process(state, setStateInternal)
      isProcessingDerived = false
    }
    
    const setState = (setter: (state: TState) => TState) => {
      state = setter(state)
      if (derivedEngine && !isProcessingDerived) {
        isProcessingDerived = true
        derivedEngine.process(state, setStateInternal)
        isProcessingDerived = false
      }
      subject.notify()
    }

    const dispatch = (action: TActions & { transition?: Transition }) => {
      // The reducer calls set() to update state
      // We don't use the return value; state is updated via set()
      reducer({
        state,
        action,
        set: setStateInternal,
      })

      // Process derived values after reducer
      if (derivedEngine && !isProcessingDerived) {
        isProcessingDerived = true
        derivedEngine.process(state, setStateInternal)
        isProcessingDerived = false
      }

      subject.notify()
    }

    const getState = () => state

    const subscribe = (callback: () => void) => {
      return subject.subscribe(callback)
    }

    const dispose = () => {
      // Cleanup if needed
    }

    return {
      state,
      transitions: transitionsStore,
      dispatch,
      setState,
      getState,
      subscribe,
      dispose,
    }
  }
}
