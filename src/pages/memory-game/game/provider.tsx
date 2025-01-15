import { PropsWithChildren, useEffect, useState } from "react"
import { createStoreFactory } from "../../../create-store"
import { createStoreUtils } from "../../../createStoreUtils"
import { MemoryCard } from "../card/type"
import { reduceGroupById } from "./fn/reduce-group-by-id"
import { filterMatched, filterVisible } from "./fn/filter-cards"
import { flatMapCreateCards } from "./fn/flat-map-create-cards"
import { updateCard } from "./fn/update-card"
import { handleExpandNode } from "~/lib/utils"
import { useHistory } from "~/hooks/use-history"

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
  reducer({ state, action, diff, dispatch, set }) {
    console.log("fn")
    if (action.type === "tap-card") {
      const card = state.$cardById[action.cardId]
      set(s => ({ cards: updateCard(s.cards, card.tap()) }))
    }

    if (action.type === "match-cards") {
      const cardsToMatch = state.$visibleCardsIdList.map(id => state.$cardById[id])

      cardsToMatch.forEach((card, index) => {
        const otherIdx = index === 0 ? 1 : 0
        const otherCard = cardsToMatch[otherIdx]
        set(s => ({ cards: updateCard(s.cards, card.match(otherCard)) }))
      })
    }

    if (diff(["cards"])) {
      set(s => ({ $cardIdList: s.cards.map(card => card.id) }))
      set(s => ({ $cardById: s.cards.reduce(...reduceGroupById()) }))
      set(s => ({ $visibleCardsIdList: filterVisible(s.cards) }))
      set(s => ({ $matchedCardsIdList: filterMatched(s.cards) }))
    }

    if (diff(["$visibleCardsIdList"])) {
      set(s => ({ $visibleCardsIdListSet: new Set(s.$visibleCardsIdList) }))
    }

    if (diff(["$matchedCardsIdList"])) {
      set(s => ({ $matchedCardsIdListSet: new Set(s.$matchedCardsIdList) }))
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
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>())
  const memoryGameState = useState(() => createMemoryGame(initialState))

  const [memoryGame] = memoryGameState

  useEffect(() => {
    Object.assign(window, { [`memoryGame${index}`]: memoryGame })
  }, [])

  useHistory(memoryGame)

  return (
    <Game.Provider value={memoryGameState}>
      {children}
      <Game.Devtools
        expandedNodes={expandedNodes}
        onExpandNode={handleExpandNode(setExpandedNodes)}
      />
    </Game.Provider>
  )
}
