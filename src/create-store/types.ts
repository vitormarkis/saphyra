import { Subject } from "../Subject"
import { TransitionsStore } from "./transitions-store"

export type TODO = any

export type GenericStore<
  TState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  state: TState
  dispatch(action: TActions): void
} & Subject

export type GenericStoreClass<
  TInitialProps,
  TState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  new (initialProps: TInitialProps): GenericStore<TState, TActions>
}

export type DefaultActions = { type: string }
export type BaseAction = { transition?: any[] }

export type Async<TState> = {
  promise<T>(promise: Promise<T>, onSuccess: (value: T, state: TState) => Partial<TState> | void): void
  timer(callback: () => void): void
}

export type TransitionsExtension = {
  transitions: TransitionsStore
}

export type BaseState = {
  currentTransition: any[] | null
}
