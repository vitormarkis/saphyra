import { StoreConstructorConfig } from "."
import { Subject } from "../Subject"
import { TransitionsStore } from "./transitions-store"

export type TODO = any

export type Dispatch<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = (action: TActions) => void

export type GenericStore<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  state: TState
  getState(): TState
  dispatch: Dispatch<TState, TActions>
  setState(newState: Partial<TState>): void
  registerSet: InnerReducerSet<TState>
  createReducer(props: CreateReducerInner<TState, TActions>): ReducerInner<TState, TActions>
  createSetScheduler(newState: TState & Partial<TState>): ReducerSet<TState>
  registerErrorHandler(handler: StoreErrorHandler): () => void
  rerender(): void
  handleError(error: unknown): void
  undo(): void
  redo(): void
} & Subject

export type GenericStoreClass<
  TInitialProps,
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  new (initialProps: TInitialProps): GenericStore<TState, TActions>
}

export type DefaultActions = { type: string }
export type BaseAction<TState extends BaseState = BaseState> = {
  transition?: any[]
  onTransitionEnd?: (state: TState) => void
}

export type AsyncActor<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  set: (setter: Setter<TState>) => void
  dispatch(action: TActions): void
}

export type Async<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
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

export type CreateReducerInner<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  store: GenericStore<TState, TActions> & Record<string, any> & TransitionsExtension
  dispatch: Dispatch<TState, TActions>
}

export type ReducerInnerProps<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = {
  set: ReducerSet<TState>
  async: Async<TState>

  prevState: TState
  action: TActions
  state: TState
  diff: Diff<TState>
}

export type ReducerInner<
  TState extends BaseState = BaseState,
  TActions extends DefaultActions & BaseAction<TState> = DefaultActions & BaseAction<TState>
> = (props: ReducerInnerProps<TState, TActions>) => TState

export type StoreErrorHandler = (error: unknown) => void

export type StoreInstantiator<TInitialProps, TStore extends GenericStore<any, any>> = (
  initialProps: TInitialProps,
  config?: StoreConstructorConfig
) => TStore
