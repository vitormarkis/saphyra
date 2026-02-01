import type { SyberiaStore } from "../../src/store"

export type SyberiaStoreGeneric = SyberiaStore<any, any>

export type NewStoreReturn<Store extends SyberiaStoreGeneric> = [
  store: Store,
  resetStore: ResetStoreFn<Store>,
  isLoading: false,
]

export type ResetStoreFn<Store extends SyberiaStoreGeneric> = (
  newStore: Store
) => void
