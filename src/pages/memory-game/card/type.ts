import { randomString } from "~/lib/utils"

export class MemoryCard {
  id: string
  value: string
  state: "hidden" | "visible" | "matched"
  matchedWithId: string | null

  private constructor(
    value: string,
    state: "hidden" | "visible" | "matched",
    matchedWithId: string | null,
    id: string
  ) {
    this.value = value
    this.state = state
    this.matchedWithId = matchedWithId
    this.id = id
  }

  static create(value: string): MemoryCard {
    return new MemoryCard(value, "hidden", null, randomString())
  }
  static restore(
    value: string,
    state: "hidden" | "visible" | "matched",
    matchedWithId: string | null,
    id: string
  ) {
    return new MemoryCard(value, state, matchedWithId, id)
  }

  tap(): MemoryCard {
    const card = this.clone()
    if (card.state === "hidden") {
      card.state = "visible"
    }

    return card
  }

  flip() {
    const card = this.clone()
    if (card.state === "visible") {
      card.state = "hidden"
    }

    throw new Error("Cannot flip a non visible card")
  }

  clone(): MemoryCard {
    return MemoryCard.restore(
      this.value,
      this.state,
      this.matchedWithId,
      this.id
    )
  }

  match(card: MemoryCard): MemoryCard {
    const newCard = this.clone()
    if (newCard.value === card.value) {
      newCard.state = "matched"
      newCard.matchedWithId = card.id
    } else {
      newCard.state = "hidden"
    }
    return newCard
  }
}
