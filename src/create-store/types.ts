import { EventEmitter, EventsTuple } from "~/create-store/event-emitter"
import { RemoveDollarSignProps } from "~/types"
import { StoreConstructorConfig } from "./store"
import { TransitionsStore } from "./transitions-store"
import { SubjectType } from "~/Subject"
import { ErrorsStore } from "~/create-store/errors-store"

export type TODO = any

export type Dispatch<TState, TActions extends BaseAction<TState>> = (
  action: TActions & BaseAction<TState>
) => void

export type HistoryExtension<TState> = {
  history: Array<TState>
  historyRedo: Array<TState>
}

type SettersRegistry<TState> = Record<
  string,
  Array<SetterOrPartialState<TState>>
>

export type KeyAbort = `abort::${string}`

export type EventsFormat = EventsTuple | Record<KeyAbort, []>

export type StoreInternalEvents = {
  "transition-completed": [
    { id: string; status: "fail" | "success" | "cancelled" },
  ]
  "new-transition": [{ transitionName: string; id: string }]
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
  stateContext: StateContext
  errorHandlers: Set<StoreErrorHandler>
  settersRegistry: SettersRegistry<TState>
} & TransitionsExtension &
  HistoryExtension<TState> &
  UncontrolledState<TUncontrolledState>

export type GenericStoreMethods<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = {
  getState(): TState
  dispatch: Dispatch<TState, TActions>
  setState(newState: Partial<TState>): void
  registerSet: InnerReducerSet<TState>
  createSetScheduler(
    newState: TState & Partial<TState>,
    newStateContext: StateContext,
    mergeType: "reducer" | "set",
    transition: any[] | null | undefined
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
  completeTransition(action: GenericAction, transition: any[]): void
  commitTransition(
    transition: any[] | null | undefined,
    onTransitionEnd?: OnTransitionEnd<TState, TEvents>
  ): void
}

type UncontrolledState<
  TUncontrolledState extends Record<string, any> = Record<string, any>,
> = {
  uncontrolledState: TUncontrolledState
}

export type SomeStore<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = GenericStoreValues<TState, TEvents, TUncontrolledState, TDeps> &
  GenericStoreMethods<TState, TActions, TEvents, TUncontrolledState, TDeps> &
  SubjectType

export type TransitionFunctionOptions = {
  transition: any[] | null | undefined
  actor: AsyncActor<any, any>
  signal: AbortSignal
}

export type DefaultActions =
  | {
      type: string
      transition?: any[]
      onTransitionEnd?: (state: TODO) => void
    }
  | {
      type: "$$lazy-value"
      transition: any[]
      transitionFn: (options: TransitionFunctionOptions) => Promise<any>
      onSuccess: (value: any, actor: AsyncActor<any, any>) => void
    }

export type TransitionStartConfig<
  TBaseAction extends GenericAction,
  TEvents extends EventsTuple,
> = {
  /**
   * The action that is being dispatched, except the key 'beforeDispatch'
   */
  action: TBaseAction
  /**
   * The store where the transitions are being orchestrated
   */
  transitionStore: TransitionsStore
  /**
   * The transition that is being dispatched
   */
  transition: any[] | null | undefined
  /**
   * A stable reference to the current transition metadata
   */
  meta: Record<string, any>
  /**
   * The store events
   */
  events: EventEmitter<TEvents>
}

export type GenericAction = {
  type: string
} & Record<string, any>

export type BeforeDispatchOptions<
  TBaseAction extends GenericAction,
  TEvents extends EventsTuple,
> = TransitionStartConfig<TBaseAction, TEvents>

export type BeforeDispatch<
  TBaseAction extends GenericAction = GenericAction,
  TEvents extends EventsTuple = EventsTuple,
> = (options: BeforeDispatchOptions<TBaseAction, TEvents>) => TBaseAction | void

export type OnTransitionEndProps<TState, TEvents extends EventsTuple> = {
  transition: any[]
  transitionStore: TransitionsStore
  state: TState
  meta: Record<string, any>
  events: EventEmitter<TEvents>
  error?: unknown
}

export type OnTransitionEnd<TState, TEvents extends EventsTuple> = (
  props: OnTransitionEndProps<TState, TEvents>
) => void

export type BaseAction<
  TState,
  TBaseAction extends GenericAction = GenericAction,
  TEvents extends EventsTuple = EventsTuple,
> = {
  type: string
  onTransitionEnd?: OnTransitionEnd<TState, TEvents>
  /**
   * Receive the action as parameter and return it.
   *
   * You can modify the action before returning.
   *
   * If you return the action, it will be dispatched to the store. If you return a nullish value, the action will be ignored.
   */
  beforeDispatch?: BeforeDispatch<TBaseAction>
  transition?: any[]
} & Record<string, any>

export type SetterOrPartialState<TState> = Setter<TState> | Partial<TState>

export type AsyncActor<TState, TActions extends BaseAction<TState>> = {
  set: (setterOrPartialState: SetterOrPartialState<TState>) => void
  dispatch(action: TActions | DefaultActions): void
  async: Async<TState, TActions>
}

export const isSetter = <TState>(
  setterOrPartialState: SetterOrPartialState<TState>
): setterOrPartialState is Setter<TState> => {
  return typeof setterOrPartialState === "function"
}

export function newSetter<TState>(
  newPartialState: Partial<TState>
): Setter<TState> {
  return () => newPartialState
}

export type AsyncPromiseProps = {
  signal: AbortSignal
}

export type PromiseResult<T, TState, TActions extends BaseAction<TState>> = {
  onSuccess: (
    callback: (value: T, actor: AsyncActor<TState, TActions>) => void
  ) => void
}

export type Async<TState, TActions extends BaseAction<TState>> = {
  promise<T>(
    promise: (props: AsyncPromiseProps) => Promise<T>
  ): PromiseResult<T, TState, TActions>
  timer(
    callback: (actor: AsyncActor<TState, TActions>) => void,
    time?: number
  ): void
}

export type Diff<TState> = (keys: (keyof TState)[]) => boolean

export type TransitionsExtension = {
  transitions: TransitionsStore
}

export type StateContext = {
  currentTransition: any[] | null
  when: number
}

export type Setter<TState> = (state: TState) => Partial<TState>

export type ReducerSet<TState> = (
  setterOrPartialState: SetterOrPartialState<TState>
) => void
export type InnerReducerSet<TState> = (
  setterOrPartialStateList: SetterOrPartialState<TState>,
  state: TState,
  stateContext: StateContext,
  transition: any[] | null | undefined,
  mergeType: "reducer" | "set"
) => void

export type StoreErrorHandler = (
  error: unknown,
  transition: any[] | undefined
) => void

export type SomeStoreGeneric = SomeStore<any, any, any, any, any>

export type StoreInstantiator<
  TInitialProps,
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple,
  TUncontrolledState extends Record<string, any>,
  TDeps,
> = (
  initialProps: RemoveDollarSignProps<TInitialProps>,
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
