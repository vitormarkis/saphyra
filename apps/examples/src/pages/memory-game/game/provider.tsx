import { PropsWithChildren, useEffect, useState } from "react"
import { MemoryCard } from "../card/type"
import { reduceGroupById } from "./fn/reduce-group-by-id"
import { filterMatched, filterVisible } from "./fn/filter-cards"
import { flatMapCreateCards } from "./fn/flat-map-create-cards"
import { updateCard } from "./fn/update-card"
import { handleExpandNode } from "~/lib/utils"
import { Devtools } from "~/devtools/devtools"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useHistory, useNewStore } from "saphyra/react"

type CardsContent = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]

export type MemoryGameInitialProps = {
  cards: CardsContent
}

type MemoryGameState = {
  cards: MemoryCard[]
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

const newMemoryGame = newStoreDef<
  MemoryGameInitialProps,
  MemoryGameState,
  MemoryGameActions
>({
  config: {
    defaults: {
      onPushToHistory({ history, state, transition, from }) {
        if (from === "dispatch" && !!transition) {
          return []
        }
        return [...history, state]
      },
    },
  },
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
      set(s => ({
        cards: updateCard(s.cards, card.tap()),
      }))
    }

    if (action.type === "match-cards") {
      const cardsToMatch = state.$visibleCardsIdList.map(
        id => state.$cardById[id]
      )

      cardsToMatch.forEach((card, index) => {
        const otherIdx = index === 0 ? 1 : 0
        const otherCard = cardsToMatch[otherIdx]
        set(s => ({
          cards: updateCard(s.cards, card.match(otherCard)),
        }))
      })
    }

    diff()
      .on([s => s.cards])
      .run(cards => {
        set({
          $cardIdList: cards.map(card => card.id),
          $cardById: cards.reduce(...reduceGroupById()),
          $visibleCardsIdList: filterVisible(cards),
          $matchedCardsIdList: filterMatched(cards),
        })
      })

    diff()
      .on([s => s.$visibleCardsIdList])
      .run(visibleCardsIdList => {
        set({
          $visibleCardsIdListSet: new Set(visibleCardsIdList),
        })
      })

    diff()
      .on([s => s.$matchedCardsIdList])
      .run(matchedCardsIdList => {
        set({
          $matchedCardsIdListSet: new Set(matchedCardsIdList),
        })
      })

    if (state.$visibleCardsIdList.length === 2) {
      dispatch({
        type: "match-cards",
      })
    }

    return state
  },
})

export const Game = createStoreUtils<typeof newMemoryGame>()

type MemoryGameProviderProps = {
  index: number
} & PropsWithChildren &
  MemoryGameInitialProps

export function MemoryGame({
  children,
  index,
  ...initialState
}: MemoryGameProviderProps) {
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>())
  const [memoryGame, resetStore, isLoading] = useNewStore(() =>
    newMemoryGame(initialState)
  )

  useEffect(() => {
    Object.assign(window, {
      [`memoryGame${index}`]: memoryGame,
    })
  }, [])

  useHistory(memoryGame)

  return (
    <Game.Context.Provider value={[memoryGame, resetStore, isLoading]}>
      {children}
      <Devtools
        store={memoryGame}
        expandedNodes={expandedNodes}
        onExpandNode={handleExpandNode(setExpandedNodes)}
      />
    </Game.Context.Provider>
  )
}
