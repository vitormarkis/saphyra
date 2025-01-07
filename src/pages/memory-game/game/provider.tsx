import { PropsWithChildren, useEffect, useState } from "react"
import { createStoreFactory } from "../../../create-store"
import { createStoreUtils } from "../../../createStoreUtils"
import { MemoryCard } from "../card/type"
import { reduceGroupById } from "./fn/reduce-group-by-id"
import { filterMatched, filterVisible } from "./fn/filter-cards"
import { flatMapCreateCards } from "./fn/flat-map-create-cards"

type CardsContent = readonly [string, string, string, string, string, string, string, string]

export type MemoryGameInitialProps = {
  cards: CardsContent
}

type MemoryGameState = {
  cards: MemoryCard[]
  currentTransition: null
  $cardIdList: string[]
  $cardById: Record<string, MemoryCard>
  $visibleCardsIdList: string[]
  $visibleCardsIdListSet: Set<string>
  $matchedCardsIdList: string[]
  $matchedCardsIdListSet: Set<string>
}

type MemoryGameActions =
  | {
      type: "tap-card"
      cardId: string
    }
  | {
      type: "match-cards"
    }

const createMemoryGame = createStoreFactory<MemoryGameInitialProps, MemoryGameState, MemoryGameActions>({
  onConstruct({ initialProps }) {
    const cards = initialProps.cards.flatMap(flatMapCreateCards)
    return {
      cards,
      currentTransition: null,
    }
  },
  reducer({ prevState, state, action, store, diff, dispatch }) {
    console.log("fn")
    if (action.type === "tap-card") {
      const card = state.$cardById[action.cardId]

      state.$cardById = {
        ...state.$cardById,
        [card.id]: card.tap(),
      }
    }

    if (action.type === "match-cards") {
      const cardsToMatch = state.$visibleCardsIdList.map(id => state.$cardById[id])

      cardsToMatch.forEach((card, index) => {
        const otherIdx = index === 0 ? 1 : 0
        const otherCard = cardsToMatch[otherIdx]
        const updatedCard = card.match(otherCard)

        state.$cardById = {
          ...state.$cardById,
          [updatedCard.id]: updatedCard,
        }
      })
    }

    if (diff(["cards"])) {
      state.$cardIdList = state.cards.map(card => card.id)
      state.$cardById = state.cards.reduce(...reduceGroupById())
    }

    if (diff(["$cardById"])) {
      state.$visibleCardsIdList = filterVisible(state.$cardById)
    }

    if (diff(["$cardById"])) {
      state.$matchedCardsIdList = filterMatched(state.$cardById)
    }

    if (diff(["$visibleCardsIdList"])) {
      state.$visibleCardsIdListSet = new Set(state.$visibleCardsIdList)
    }

    if (diff(["$matchedCardsIdList"])) {
      state.$matchedCardsIdListSet = new Set(state.$matchedCardsIdList)
    }

    if (state.$visibleCardsIdList.length === 2) {
      dispatch({
        type: "match-cards",
      })
    }

    return state
  },
})

export const Game = createStoreUtils<typeof createMemoryGame>()

type MemoryGameProviderProps = {
  index: number
} & PropsWithChildren &
  MemoryGameInitialProps

export function MemoryGame({ children, index, ...initialState }: MemoryGameProviderProps) {
  const memoryGameState = useState(() => createMemoryGame(initialState))

  useEffect(() => {
    Object.assign(window, { [`memoryGame${index}`]: memoryGameState[0] })
  }, [])

  return <Game.Provider value={memoryGameState}>{children}</Game.Provider>
}
