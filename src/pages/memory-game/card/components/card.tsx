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
          // @ts-ignore
          transition: ["tap-card"],
        })
      }}
      className="flex w-full items-center justify-center h-full border border-black border-dashed rounded-md bg-slate-50 hover:bg-slate-200 dark:bg-slate-900 dark:border-neutral-700 dark:hover:border-neutral-700 dark:hover:bg-slate-800 outline-none"
    >
      <span className="scale-[2.3]">
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
