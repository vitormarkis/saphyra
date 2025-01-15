import { EventEmitter, EventsTuple } from "~/create-store/event-emitter"
import { RemoveDollarSignProps } from "~/types"
import { StoreConstructorConfig } from "."
import { TransitionsStore } from "./transitions-store"
import { Subject, SubjectType } from "~/Subject"

export type TODO = any

export type Dispatch<TState extends BaseState, TActions extends DefaultActions & BaseAction<TState>> = (
  action: TActions & BaseAction<TState>
) => void

export type HistoryExtension<TState extends BaseState> = {
  history: Array<TState>
  historyRedo: Array<TState>
}

export type GenericStoreValues<TState extends BaseState, TEvents extends EventsTuple = EventsTuple> = {
  events: EventEmitter<TEvents>
  state: TState
  errorHandlers: Set<StoreErrorHandler>
  setStateCallbacks: Record<string, Array<(state: TState) => Partial<TState>>>
} & TransitionsExtension &
  HistoryExtension<TState>

export type GenericStoreMethods<
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = {
  getState(): TState
  dispatch: Dispatch<TState, TActions>
  setState(newState: Partial<TState>): void
  registerSet: InnerReducerSet<TState>
  createSetScheduler(
    newState: TState & Partial<TState>,
    mergeType: "reducer" | "set",
    transition: any[] | null | undefined
  ): ReducerSet<TState>
  registerErrorHandler(handler: StoreErrorHandler): () => void
  rerender(): void
  handleError(error: unknown): void
  undo(): void
  redo(): void
  rebuild(): () => SomeStore<TState, TActions, TEvents>
}

export type SomeStore<
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = GenericStoreValues<TState, TEvents> & GenericStoreMethods<TState, TActions, TEvents> & SubjectType

export type DefaultActions = { type: string; transition?: any[] }
export type BaseAction<TState extends BaseState> = {
  onTransitionEnd?: (state: TState) => void
  transition?: any[]
}

export type AsyncActor<TState extends BaseState, TActions extends DefaultActions & BaseAction<TState>> = {
  set: (setter: Setter<TState>) => void
  dispatch(action: TActions & BaseAction<TState>): void
}

export type Async<TState extends BaseState, TActions extends DefaultActions & BaseAction<TState>> = {
  promise<T>(promise: Promise<T>, onSuccess: (value: T, actor: AsyncActor<TState, TActions>) => void): void
  timer(callback: (actor: AsyncActor<TState, TActions>) => void): void
}

export type Diff<TState> = (keys: (keyof TState)[]) => boolean

export type TransitionsExtension = {
  transitions: TransitionsStore
}

export type BaseState = {
  currentTransition: any[] | null
}

export type Setter<TState> = (state: TState) => Partial<TState>

export type ReducerSet<TState> = (setter: (state: TState) => Partial<TState>) => void
export type InnerReducerSet<TState> = (
  setterList: Setter<TState>,
  state: TState,
  transition: any[] | null | undefined,
  mergeType: "reducer" | "set"
) => void

export type StoreErrorHandler = (error: unknown) => void

export type SomeStoreGeneric = SomeStore<any, any, any>

export type StoreInstantiator<
  TInitialProps,
  TState extends BaseState,
  TActions extends DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple
> = (
  initialProps: RemoveDollarSignProps<TInitialProps>,
  config?: StoreConstructorConfig
) => SomeStore<TState, TActions, TEvents>

export type StoreInstantiatorGeneric = StoreInstantiator<any, any, any, any>

export type ExtractEvents<T> = T extends SomeStore<any, any, infer E> ? E : never
export type ExtractActions<T> = T extends SomeStore<any, infer A, any> ? A : never
