import { MemoryGameCard } from "./card/components/card"
import { MemoryGameCardList } from "./game/components/card-list"
import { MemoryGame } from "./game/provider"

type MemoryGamePageProps = {}

const CARDS = ["👹", "👺", "👻", "👼", "👽", "👾", "🤖", "😺"] as const

export function MemoryGamePage({}: MemoryGamePageProps) {
  return (
    <div className="flex gap-2 h-full">
      <div className="flex flex-col @xl:flex-row gap-10 flex-1 h-full">
        <MemoryGame
          index={0}
          cards={CARDS}
        >
          <MemoryGameCardList>
            <MemoryGameCard />
          </MemoryGameCardList>
        </MemoryGame>
        {/* <MemoryGame
          index={1}
          cards={CARDS_2}
        >
          <MemoryGameCardList>
            <MemoryGameCard />
          </MemoryGameCardList>
        </MemoryGame> */}
        {/* <MemoryGame
        index={1}
        cards={["a", "b"]}
        currentTransition={null}
      ></MemoryGame> */}
      </div>
    </div>
  )
}
