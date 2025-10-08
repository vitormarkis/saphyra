import { useCallback, useRef, useState, useSyncExternalStore } from "react"
import { NewStoreReturn } from "../types"
import { SomeStoreGeneric } from "~/types"

const useIsBootstrapping = (store: SomeStoreGeneric) =>
  useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.isHappening(["bootstrap"]),
    () => store.transitions.isHappening(["bootstrap"])
  )

export function useNewStore<Store extends SomeStoreGeneric>(
  instantiatorFn: () => Store
): NewStoreReturn<Store> {
  const [currentStore, setStore] = useState<Store>(instantiatorFn)
  const initialStore = useRef(currentStore)
  const isInitialStore = initialStore.current === currentStore
  const isBootstrapping = useIsBootstrapping(currentStore)

  const resetStore = useCallback(
    (newStore: Store) => {
      if (newStore === currentStore) {
        throw new Error("New store is the same as the current store")
      }

      if (newStore.isDisposed) {
        throw new Error("Invalid operation: New store is already disposed")
      }

      setStore(newStore)
    },
    [currentStore]
  )

  // TO-DO: Find a better way to clean up the store.
  // useEffect(
  //   function cleanUp() {
  //     return () => void currentStore.dispose()
  //   },
  //   [currentStore]
  // )

  const isLoading = isBootstrapping
    ? isInitialStore
      ? "initial-store-loading"
      : "new-store-loading"
    : false

  return [currentStore, resetStore, isLoading]
}
