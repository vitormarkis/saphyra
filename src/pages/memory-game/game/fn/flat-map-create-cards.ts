import { MemoryCard } from "../../card/type"

export function flatMapCreateCards(cardContent: string) {
  return [
    MemoryCard.create(cardContent),
    MemoryCard.create(cardContent),
  ] as const
}
