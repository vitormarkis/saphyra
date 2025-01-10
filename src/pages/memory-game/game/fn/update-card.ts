import { MemoryCard } from "../../card/type"

export function updateCard(cards: MemoryCard[], updatedCard: MemoryCard) {
  return cards.map(card => {
    if (card.id === updatedCard.id) {
      return updatedCard
    }
    return card
  })
}
