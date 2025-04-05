import { useSyncExternalStore } from "react"
import { Game } from "../game/provider"
import { useMemoryCardId } from "./card-context"
import { MemoryCard } from "./type"

function defaultSelector<T>(data: T) {
  return data
}

export function useMemoryCard<R = MemoryCard>(
  selector?: (data: MemoryCard) => R
) {
  const [store] = Game.useUseState()
  const cardId = useMemoryCardId()
  const finalSelector = selector ?? (defaultSelector as (data: MemoryCard) => R)
  return useSyncExternalStore(
    cb => store.subscribe(cb),
    () => finalSelector(store.getState().$cardById[cardId])
  )
}
