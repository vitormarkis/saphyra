import { Game } from "../../game/provider"
import { useMemoryCard } from "../hooks"

type MemoryGameCardProps = {}

export function MemoryGameCard({}: MemoryGameCardProps) {
  const [memoryGame] = Game.useUseState()
  const cardId = useMemoryCard(s => s.id)

  return (
    <button
      onClick={() => {
        memoryGame.dispatch({
          type: "tap-card",
          cardId,
        })
      }}
      className="flex w-full items-center justify-center h-full border border-black border-dashed rounded-md bg-gray-50 hover:bg-gray-200"
    >
      <span className="scale-150">
        <MemoryGameCardContent />
      </span>
    </button>
  )
}

type MemoryGameCardContentProps = {}

export function MemoryGameCardContent({}: MemoryGameCardContentProps) {
  const state = useMemoryCard(s => s.state)
  if (state === "hidden") return ""
  return <MemoryGameCardContentValue />
}

export function MemoryGameCardContentValue({}: MemoryGameCardContentProps) {
  return useMemoryCard(s => s.value)
}
