import { useCallback, useSyncExternalStore } from "react"
import type { ReactState, SomeStoreGeneric } from "saphyra"
import { exact } from "~/fn/common"

export function useBootstrapError<TStore extends SomeStoreGeneric>(
  [store, setStore]: ReactState<TStore>,
  instantiateStore: () => TStore
) {
  const error = useSyncExternalStore(
    cb => store.errors.subscribe(cb),
    () => store.errors.state.bootstrap,
    () => store.errors.state.bootstrap
  )

  const tryAgain = useCallback(() => {
    setStore(instantiateStore)
  }, [setStore, instantiateStore])

  return exact([error, tryAgain])
}
