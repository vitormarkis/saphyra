import { PropsWithChildren, useEffect, useState } from "react"
import { createStoreFactory } from "../../../create-store"
import { createStoreUtils } from "../../../createStoreUtils"
import { MemoryCard } from "../card/type"

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
    const cards = initialProps.cards.flatMap(cardContent => {
      return [MemoryCard.create(cardContent), MemoryCard.create(cardContent)]
    })
    return {
      cards,
      currentTransition: null,
    }
  },
  reducer({ prevState, state, action, store, diff }) {
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

      cardsToMatch.forEach((cardToMatch, index) => {
        const otherIdx = index === 0 ? 1 : 0
        const cardToMatchOther = cardsToMatch[otherIdx]
        const [, updatedCard] = cardToMatch.match(cardToMatchOther)
        state._cardById = {
          ...state._cardById,
          [updatedCard.id]: updatedCard,
        }
      })
    }

    if (diff(["cards"])) {
      state._cardIdList = state.cards.map(card => card.id)
      state._cardById = state.cards.reduce((acc, card) => ({ ...acc, [card.id]: card }), {})
    }

    if (diff(["_cardById"])) {
      state._visibleCardsIdList = Object.values(state._cardById).reduce((acc, item) => {
        return item.state === "visible" ? [...acc, item.id] : acc
      }, [] as string[])
    }

    if (diff(["_cardById"])) {
      state._matchedCardsIdList = Object.values(state._cardById).reduce((acc, item) => {
        return item.state === "matched" ? [...acc, item.id] : acc
      }, [] as string[])
    }

    if (diff(["_visibleCardsIdList"])) {
      state._visibleCardsIdListSet = new Set(state._visibleCardsIdList)
    }

    if (diff(["_matchedCardsIdList"])) {
      state._matchedCardsIdListSet = new Set(state._matchedCardsIdList)
    }

    if (state._visibleCardsIdList.length === 2) {
      setTimeout(() => {
        store.dispatch({
          type: "match-cards",
        })
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
