import { Subject } from "../Subject"

export type TODO = any

export type GenericStore<TState, TActions> = {
  state: TState
  dispatch(action: TActions): void
  render(state: TState): void
} & Subject

export type GenericStoreClass<TInitialProps, TState, TActions> = {
  new (initialProps: TInitialProps): GenericStore<TState, TActions>
}

export type DefaultActions = any
export type BaseAction = { transition?: any[] }
