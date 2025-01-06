import { MemoryGameCard } from "./card/components/card"
import { MemoryGameCardList } from "./game/components/card-list"
import { MemoryGame } from "./game/provider"

type MemoryGamePageProps = {}

const CARDS = ["👹", "👺", "👻", "👼", "👽", "👾", "🤖", "😺"] as const

export function MemoryGamePage({}: MemoryGamePageProps) {
  return (
    <div className="flex gap-2">
      <div className="flex gap-2 flex-1 h-full aspect-square">
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
        cards={["a", "b"]}
        currentTransition={null}
      ></MemoryGame> */}
      </div>
    </div>
  )
}
