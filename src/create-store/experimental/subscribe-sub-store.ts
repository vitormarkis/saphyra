import { SomeStoreGeneric } from "../types"

export function subscribeSubStore(store: SomeStoreGeneric, rerender: () => void) {
  return store.subscribe(() => {
    rerender()
  })
}
