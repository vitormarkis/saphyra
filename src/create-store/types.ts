import { Subject } from "../Subject"
import { TransitionsStore } from "./transitions-store"

export type TODO = any

export type Dispatch<TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction> = (
  action: TActions
) => void

export type GenericStore<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  state: TState
  dispatch: Dispatch<TActions>
  setState(newState: Partial<TState>): void
  registerSet: InnerReducerSet<TState>
  createReducer(props: CreateReducerInner<TState, TActions>): ReducerInner<TState, TActions>
  createSet(newState: TState & Partial<TState>): ReducerSet<TState>
  registerErrorHandler(handler: StoreErrorHandler): () => void
} & Subject

export type GenericStoreClass<
  TInitialProps,
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  new (initialProps: TInitialProps): GenericStore<TState, TActions>
}

export type DefaultActions = { type: string }
export type BaseAction = { transition?: any[] }

export type AsyncActor<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  set: (setter: Setter<TState>) => void
  dispatch(action: TActions): void
}

export type Async<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  promise<T>(promise: Promise<T>, onSuccess: (value: T, actor: AsyncActor<TState, TActions>) => void): void
  timer(callback: (actor: AsyncActor<TState, TActions>) => void): void
}

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

export type CreateReducerInner<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  prevState: TState
  store: GenericStore<TState, TActions> & Record<string, any> & TransitionsExtension
  set: ReducerSet<TState>
  async: Async<TState>
}

export type ReducerInnerProps<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  action: TActions
  state: TState
}

export type ReducerInner<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = (props: ReducerInnerProps<TState, TActions>) => TState

export type StoreErrorHandler = (error: unknown) => void
