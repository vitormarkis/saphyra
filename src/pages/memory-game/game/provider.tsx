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
  _cardIdList: string[]
  _cardById: Record<string, MemoryCard>
  _visibleCardsIdList: string[]
  _visibleCardsIdListSet: Set<string>
  _matchedCardsIdList: string[]
  _matchedCardsIdListSet: Set<string>
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
      const card = state._cardById[action.cardId]

      state._cardById = {
        ...state._cardById,
        [card.id]: card.tap(),
      }
    }

    if (action.type === "match-cards") {
      const cardsToMatch = state._visibleCardsIdList.map(id => state._cardById[id])

      cardsToMatch.forEach((card, index) => {
        const otherIdx = index === 0 ? 1 : 0
        const otherCard = cardsToMatch[otherIdx]
        const updatedCard = card.match(otherCard)

        state._cardById = {
          ...state._cardById,
          [updatedCard.id]: updatedCard,
        }
      })
    }

    if (diff(["cards"])) {
      state._cardIdList = state.cards.map(card => card.id)
      state._cardById = state.cards.reduce(...reduceGroupById())
    }

    if (diff(["_cardById"])) {
      state._visibleCardsIdList = filterVisible(state._cardById)
    }

    if (diff(["_cardById"])) {
      state._matchedCardsIdList = filterMatched(state._cardById)
    }

    if (diff(["_visibleCardsIdList"])) {
      state._visibleCardsIdListSet = new Set(state._visibleCardsIdList)
    }

    if (diff(["_matchedCardsIdList"])) {
      state._matchedCardsIdListSet = new Set(state._matchedCardsIdList)
    }

    if (state._visibleCardsIdList.length === 2) {
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
