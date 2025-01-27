import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { SomeStoreGeneric } from "~/create-store/types"
import { exact } from "~/lib/module-response-type"
import { ReactState } from "~/types"

export function useBootstrapError<TStore extends SomeStoreGeneric>(
  [store, setStore]: ReactState<TStore>,
  instantiateStore: () => TStore
) {
  const error = useSyncExternalStore(
    cb => store.errors.subscribe(cb),
    () => store.errors.state.bootstrap
  )

  const tryAgain = useCallback(() => {
    setStore(instantiateStore)
  }, [setStore, instantiateStore])

  return exact([error, tryAgain])
}
