import { useEffect } from "react"
import { useSaphyra } from "./use-saphyra"
import { SomeStoreGeneric } from "saphyra"
import { extractPromiseValue } from "../fn"

export type StringSerializable = string | number | boolean | null | undefined

export const useSuspenseStore = <TStore extends SomeStoreGeneric>(
  storeInstantiator: () => TStore,
  key: StringSerializable[] | StringSerializable
) => {
  const { promises } = useSaphyra()
  const keyString = Array.isArray(key) ? key.join("~%~") : String(key)

  useEffect(() => {
    return () => void promises.delete(keyString)
  }, [])

  const cachedPromise = promises.get(keyString)
  if (cachedPromise) {
    return extractPromiseValue(cachedPromise) as TStore
  }

  const store = storeInstantiator()
  const isBootstraping = store.transitions.isHappening(["bootstrap"])

  if (!isBootstraping) {
    return store
  }

  const bootstrapPromise = new Promise<TStore>((resolve, reject) => {
    const unsubList = [
      store.transitions.events.done.once("bootstrap").run(() => {
        unsubList.forEach(unsub => unsub())
        resolve(store)
      }),
      store.transitions.events.error.once("bootstrap").run(error => {
        unsubList.forEach(unsub => unsub())
        reject(error)
      }),
    ]
  })

  promises.set(keyString, bootstrapPromise)

  return extractPromiseValue(bootstrapPromise)
}
