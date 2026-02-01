import { useCallback, useRef, useState } from "react"
import { NewStoreReturn } from "../types"
import type { SyberiaStoreGeneric } from "../types"

export function useNewStore<Store extends SyberiaStoreGeneric>(
  instantiatorFn: () => Store
): NewStoreReturn<Store> {
  const [currentStore, setStore] = useState<Store>(instantiatorFn)

  const resetStore = useCallback(
    (newStore: Store) => {
      if (newStore === currentStore) {
        throw new Error("New store is the same as the current store")
      }

      setStore(newStore)
    },
    [currentStore]
  )

  // Syberia stores don't have bootstrap transitions, so isLoading is always false
  return [currentStore, resetStore, false]
}
