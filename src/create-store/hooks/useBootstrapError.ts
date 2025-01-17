import { useCallback, useEffect, useState } from "react"
import { SomeStoreGeneric } from "~/create-store/types"
import { exact } from "~/lib/module-response-type"
import { ReactState } from "~/types"

export function useBootstrapError<TStore extends SomeStoreGeneric>(
  [store, setStore]: ReactState<TStore>,
  instantiateStore: () => TStore
) {
  const [error, setError] = useState<unknown | null>(null)

  useEffect(() => {
    const unsub = store.registerErrorHandler((error, transition) => {
      if (transition.join(":") === "bootstrap") {
        setError(error)
      }
    })
    return () => void unsub()
  }, [store, setError])

  const tryAgain = useCallback(() => {
    setError(null)
    setStore(instantiateStore)
  }, [setStore, setError, instantiateStore])

  return exact([error, tryAgain])
}
