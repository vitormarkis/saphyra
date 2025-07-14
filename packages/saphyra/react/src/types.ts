import { WaitForResult } from "~/fn/wait-for"
import { SomeStoreGeneric } from "~/types"

export type StateTuple<T> = [T, React.Dispatch<React.SetStateAction<T>>]

export type NewStoreReturn<Store extends SomeStoreGeneric> = [
  store: Store,
  resetStore: ResetStoreFn<Store>,
  isLoading: NewStoreIsLoading,
]

export type ResetStoreFn<Store extends SomeStoreGeneric> = (
  newStore: Store
) => Promise<WaitForResult>

export type NewStoreIsLoading =
  | "initial-store-loading"
  | "new-store-loading"
  | false
