import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { NewStoreReturn } from "../types"
import { SomeStoreGeneric } from "~/types"
import { WaitForResult } from "~/fn/wait-for"

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
    async (newStore: Store): Promise<WaitForResult> => {
      if (newStore === currentStore) {
        const error = new Error("New store is the same as the current store")
        currentStore.emitError(error)
        return { success: false, reason: "error", error }
      }

      if (newStore.isDisposed) {
        const error = new Error(
          "Invalid operation: New store is already disposed"
        )
        currentStore.emitError(error)
        return { success: false, reason: "error", error }
      }

      setStore(newStore)
      return newStore.waitForBootstrap()
    },
    [currentStore]
  )

  useEffect(
    function cleanUp() {
      return () => void currentStore.dispose()
    },
    [currentStore]
  )

  const isLoading = isInitialStore
    ? "initial-store-loading"
    : isBootstrapping
      ? "new-store-loading"
      : false

  return [currentStore, resetStore, isLoading]
}
