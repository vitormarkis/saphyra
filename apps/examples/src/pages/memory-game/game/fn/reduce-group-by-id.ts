import { MemoryCard } from "../../card/type"

export function reduceGroupById() {
  return [
    (acc: Record<string, any>, card: MemoryCard) => {
      return { ...acc, [card.id]: card }
    },
    {},
  ] as const
}
