import { randomString } from "../../../lib/utils"

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
    if (this.state === "hidden") {
      this.state = "visible"
    }

    return this.clone()
  }

  flip() {
    if (this.state === "visible") {
      this.state = "hidden"
    }

    throw new Error("Cannot flip a non visible card")
  }

  clone(): MemoryCard {
    return MemoryCard.restore(this.value, this.state, this.matchedWithId, this.id)
  }

  match(card: MemoryCard): [boolean, MemoryCard] {
    if (this.value === card.value) {
      this.state = "matched"
      this.matchedWithId = card.id
      return [true, this.clone()]
    } else {
      this.state = "hidden"
      return [false, this]
    }
  }
}
