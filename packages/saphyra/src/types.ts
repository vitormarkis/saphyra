import { EventEmitter, EventsTuple } from "./event-emitter"
import { StoreConstructorConfig } from "./store"
import { TransitionsStore } from "./transitions-store"
import { ErrorsStore } from "./errors-store"
import { SubjectType } from "./Subject"
import { TransitionsStateStore } from "./transitions-state"
import { WaitForResult } from "./fn/wait-for"

export type TODO = any

export type Dispatch<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
> = (action: ClassicAction<TState, TActions, TEvents>) => void

export type ClassicAction<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
> = TActions & BaseAction<TState, TActions, TEvents>

export type ClassicActionRedispatch<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
> = TActions & Omit<BaseAction<TState, TActions, TEvents>, "beforeDispatch">

export type HistoryExtension<TState> = {
  history: Array<TState>
  historyRedo: Array<TState>
}

export type Registry<TState> = {
  [key: string]: Array<SetterOrPartialState<TState>>
}

export class OptimisticRegistry<TState> {
  private settersOrPartialStateList: Registry<TState> = {}

  constructor() {}

  add(key: string, setterOrPartialState: SetterOrPartialState<TState>) {
    this.settersOrPartialStateList[key] ??= []
    this.settersOrPartialStateList[key].push(setterOrPartialState)
  }

  clear(key: string) {
    this.settersOrPartialStateList[key] = []
  }

  check(transition: TransitionNullable) {
    if (!transition) return false
    const transitionKey = transition.join(":")
    if (!(transitionKey in this.settersOrPartialStateList)) return false
    return this.settersOrPartialStateList[transitionKey].length > 0
  }

  get() {
    return this.settersOrPartialStateList
  }
}

type SettersRegistry<TState> = Record<
  string,
  Array<SetterOrPartialState<TState>>
>

export type KeyAbort = `abort::${string}`

export type EventsFormat = EventsTuple | Record<KeyAbort, []>

export type StoreInternalEvents = {
  "transition-completed": [
    { id: string; status: "fail" | "success" | "cancelled"; error?: unknown },
  ]
  "new-transition": [
    { transitionName: string; id: string; label: string | null },
  ]
}

type StoreInternals = {
  events: EventEmitter<StoreInternalEvents>
}

export type GenericStoreValues<
  TState,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  deps: TDeps
  errors: ErrorsStore
  events: EventEmitter<TEvents>
  internal: StoreInternals
  state: TState
  optimisticState: TState
  errorHandlers: Set<StoreErrorHandler>
  settersRegistry: SettersRegistry<TState>
  optimisticRegistry: OptimisticRegistry<TState>
  transitionsState: TransitionsStateStore<TState>
  name?: string
} & TransitionsExtension &
  HistoryExtension<TState> &
  UncontrolledState<TUncontrolledState>

type SetStateOptions = {
  transition?: TransitionNullable
}

export type InnerCreateAsync<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  when: string
  transition: TransitionNullable
  signal: AbortSignal
  onAsyncOperation: (asyncOperation: AsyncOperation) => void
  from?: string
}

export type HandleActionProps<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  when: string
  state?: TState
  optimisticState?: TState
  prevState?: TState
  createAsync?: (
    props: InnerCreateAsync<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >
  ) => Async
  onSet?: (setterOrPartialState: SetterOrPartialState<TState>) => void
  optimisticStateSource?: TState
}

export type GenericStoreMethods<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  getState(): TState
  getOptimisticState(): TState
  dispatch: Dispatch<TState, TActions, TEvents>
  setState(
    setterOrPartialState: SetterOrPartialState<TState>,
    options?: SetStateOptions
  ): void
  registerOptimistic: InnerReducerOptimistic<TState>
  createOptimisticScheduler(
    transition: TransitionNullable,
    notify: "notify" | "no-notify"
  ): ReducerSet<TState>
  registerErrorHandler(handler: StoreErrorHandler): () => void
  rerender(): void
  handleError: StoreErrorHandler
  undo(): void
  redo(): void
  rebuild(): () => SomeStore<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
  completeTransition(
    transition: Transition,
    action: TActions,
    onTransitionEnd?: OnTransitionEnd<TState, TEvents>
  ): void
  commitTransition(
    transition: TransitionNullable,
    action: TActions,
    onTransitionEnd?: OnTransitionEnd<TState, TEvents>
  ): void
  handleAction(
    action: TActions,
    props: HandleActionProps<
      TState,
      TActions,
      TEvents,
      TUncontrolledState,
      TDeps
    >
  ): {
    newState: TState
    prevState: TState
  }
  abort(transition: TransitionNullable): void
  cleanUpTransition(transition: Transition, error: unknown | null): void
  waitFor(transition: Transition, timeout?: number): Promise<WaitForResult>
  waitForBootstrap(timeout?: number): Promise<WaitForResult>
}

type UncontrolledState<
  TUncontrolledState extends Record<string, any> = Record<string, any>,
> = {
  uncontrolledState: TUncontrolledState
}

export type SomeStore<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = GenericStoreValues<TState, TEvents, TUncontrolledState, TDeps> &
  GenericStoreMethods<TState, TActions, TEvents, TUncontrolledState, TDeps> &
  SubjectType

export type TransitionFunctionOptions = {
  transition: TransitionNullable
  signal: AbortSignal
}

export type DefaultActions =
  | {
      type: string
      transition?: TransitionNullable
      onTransitionEnd?: (state: TODO) => void
    }
  | {
      type: "$$lazy-value"
      transition: TransitionNullable
      transitionFn: (options: TransitionFunctionOptions) => Promise<any>
      onSuccess: (value: any) => void
    }

export type ActionShape = {
  type: string
}

export type BaseAction<
  TState extends Record<string, any> = any,
  TActions extends ActionShape = ActionShape,
  TEvents extends EventsTuple = EventsTuple,
> = {
  transition?: TransitionNullable
  onTransitionEnd?: (props: OnTransitionEndProps<TState, TEvents>) => void
  beforeDispatch?: BeforeDispatch<TState, TActions, TEvents>
  controller?: AbortController
}

export type ActionRedispatch<TActions extends ActionShape> = Omit<
  TActions,
  "beforeDispatch"
>

export type BeforeDispatchOptions<
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  /**
   * The main feature store
   */
  store: SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>
  /**
   * The action that is being dispatched, except the key 'beforeDispatch'
   */
  action: ClassicActionRedispatch<TState, TActions, TEvents>
  /**
   * The store where the transitions are being orchestrated
   */
  transitionStore: TransitionsStore
  /**
   * The transition that is being dispatched
   */
  transition: TransitionNullable
  /**
   * A stable reference to the current transition metadata
   */
  meta: Record<string, any>
  /**
   * The store events
   */
  events: EventEmitter<TEvents>
  /**
   * Enables you to add more async operations in the name of a transition
   *
   * For example: you can debounce a search query and group the wait
   * time and request time under the same transition
   */
  createAsync: (transition?: TransitionNullable, signal?: AbortSignal) => Async
  /**
   * Used to abort an ongoing transition
   *
   * If the provided transition is not ongoing, it will do nothing
   */
  abort(transition: TransitionNullable): void
}

export type BeforeDispatch<
  TState extends Record<string, any> = any,
  TActions extends ActionShape = ActionShape,
  TEvents extends EventsTuple = EventsTuple,
  TUncontrolledState extends Record<string, any> = Record<string, any>,
  TDeps = undefined,
> = (
  options: BeforeDispatchOptions<
    TState,
    TActions,
    TEvents,
    TUncontrolledState,
    TDeps
  >
) => ClassicActionRedispatch<TState, TActions, TEvents> | void

export type OnTransitionEndProps<TState, TEvents extends EventsTuple> = {
  transition: Transition
  transitionStore: TransitionsStore
  state: TState
  meta: Record<string, any>
  events: EventEmitter<TEvents>
  error?: unknown
}

export type OnTransitionEnd<TState, TEvents extends EventsTuple> = (
  props: OnTransitionEndProps<TState, TEvents>
) => void

export type SetterOrPartialState<TState> = Setter<TState> | Partial<TState>

export type AsyncPromiseProps = {
  signal: AbortSignal
}

export type PromiseResult<T> = {
  onSuccess: (callback: (value: T) => void) => void
}

export type AsyncPromiseConfig = {
  label?: string
}

export type AsyncTimerConfig = {
  label?: string
}

export type Async = {
  promise<T>(
    promise: (props: AsyncPromiseProps) => Promise<T>,
    config?: AsyncPromiseConfig
  ): void
  timer(callback: () => void, time?: number, config?: AsyncTimerConfig): void
}

export type Diff<TState> = (keys: (keyof TState)[]) => boolean

export type TransitionsExtension = {
  transitions: TransitionsStore
}

export type Setter<TState> = (state: TState) => Partial<TState>

export type ReducerOptimistic<TState> = (
  setterOrPartialState: SetterOrPartialState<TState>
) => void
export type ReducerSet<TState> = (
  setterOrPartialState: SetterOrPartialState<TState>
) => void
export type InnerReducerOptimistic<TState> = (
  setterOrPartialStateList: SetterOrPartialState<TState>,
  transition: TransitionNullable,
  notify: "notify" | "no-notify"
) => void
export type InnerReducerSet<TState> = (
  setterOrPartialStateList: SetterOrPartialState<TState>,
  state: TState,
  transition: TransitionNullable
) => void

export type StoreErrorHandler = (
  error: unknown,
  transition: TransitionNullable
) => void

export type SomeStoreGeneric = SomeStore<any, any, any, any, any>

export type StoreInstantiator<
  TInitialProps,
  TState extends Record<string, any>,
  TActions extends ActionShape,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  initialProps: RemoveFunctionProps<RemoveDollarSignProps<TInitialProps>>,
  config?: StoreConstructorConfig<TDeps>
) => SomeStore<TState, TActions, TEvents, TUncontrolledState, TDeps>

export type StoreInstantiatorGeneric = StoreInstantiator<
  any,
  any,
  any,
  any,
  any,
  any
>

export type ExtractEvents<T> =
  T extends SomeStore<any, any, infer E, any, any> ? E : never
export type ExtractActions<T> =
  T extends SomeStore<any, infer A, any, any, any> ? A : never
export type ExtractUncontrolledState<T> =
  T extends SomeStore<any, any, any, infer US, any> ? US : never

type OnFinishTransitionProps = {
  transitionName: string
  transitionStore: TransitionsStore
}

export type OnFinishTransition = (options: OnFinishTransitionProps) => void

export type DoneKeyOptions = {
  onFinishTransition: OnFinishTransition
}

export type EmitErrorOptions = {
  onFinishTransition: OnFinishTransition
}

export type RemoveDollarSignProps<T> = {
  [K in keyof T as K extends `$${string}` ? never : K]: T[K]
}

export type RemoveFunctionProps<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K]
}

export type InitialProps<TState> = RemoveFunctionProps<
  RemoveDollarSignProps<TState>
>

export type ReactState<T> = [T, React.Dispatch<React.SetStateAction<T>>]

export type NonUndefined<T> = T & ({} & null)

export type RequireKeys<T extends object, K extends keyof T> = Required<
  Pick<T, K>
> &
  Omit<T, K> extends infer O
  ? { [P in keyof O]: O[P] }
  : never

type StringSerializable = string | number | boolean | null | undefined
export type Transition = StringSerializable[]
export type TransitionNullable = Transition | null | undefined

export type Selector<TState, TValue> = (state: TState) => TValue
export type Evaluator<TArgs extends any[], TReturn> = (
  ...args: TArgs
) => TReturn

export type DerivationConfig<TState, TArgs extends any[], TReturn> = {
  selectors: Selector<TState, any>[]
  evaluator: Evaluator<TArgs, TReturn>
}

export type DerivationsConfig<TState> = {
  [K in keyof TState as TState[K] extends (...args: any[]) => any
    ? K
    : never]: DerivationConfig<TState, any[], any>
}

export type StateWithDerivations<
  TState,
  TDerivations extends DerivationsConfig<TState>,
> = TState & {
  [K in keyof TDerivations]: () => any
}

export type AsyncOperation = {
  when: number
  fn?: () => void
  type: "promise" | "timeout" | "manual"
  label?: string | null
  whenReadable: string
}
