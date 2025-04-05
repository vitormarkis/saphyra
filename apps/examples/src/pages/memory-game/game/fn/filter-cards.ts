import { MemoryCard } from "../../card/type"

export function filterMatched(cards: MemoryCard[]) {
  return filter(cards, "matched")
}

export function filterVisible(cards: MemoryCard[]) {
  return filter(cards, "visible")
}

export function filter<T extends any[]>(arr: T, state: string) {
  return arr.reduce((acc, item) => {
    return item.state === state ? [...acc, item.id] : acc
  }, [] as string[])
}
