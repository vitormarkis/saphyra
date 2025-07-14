import { useCallback, useSyncExternalStore } from "react"
import type { SomeStoreGeneric } from "saphyra"
import { exact } from "~/fn/common"
import { NewStoreReturn } from "../types"

export function useBootstrapError<TStore extends SomeStoreGeneric>(
  [store, resetStore]: NewStoreReturn<TStore>,
  instantiateStore: () => TStore
) {
  const error = useSyncExternalStore(
    cb => store.errors.subscribe(cb),
    () => store.errors.state.bootstrap,
    () => store.errors.state.bootstrap
  )

  const tryAgain = useCallback(() => {
    resetStore(instantiateStore())
  }, [resetStore, instantiateStore])

  return exact([error, tryAgain])
}
