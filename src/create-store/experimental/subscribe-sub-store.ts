import { GenericStore, TransitionsExtension } from "../types"

export function subscribeSubStore(
  store: GenericStore<any, any> & TransitionsExtension,
  rerender: () => void
) {
  return store.subscribe(() => {
    rerender()
  })
}
