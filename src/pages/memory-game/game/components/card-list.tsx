import { PropsWithChildren } from "react"
import { MemoryCardIdProvider } from "../../card/card-context"
import { Game } from "../provider"

type MemoryGameCardListProps = PropsWithChildren

export function MemoryGameCardList({ children }: MemoryGameCardListProps) {
  const cardIdListStr = Game.useStore(s => JSON.stringify(s.$cardIdList))
  const cardIdList: string[] = JSON.parse(cardIdListStr)

  return (
    <ul className="grid grid-cols-4 grid-rows-4 flex-1 gap-2 max-h-[24rem]">
      {cardIdList.map(cardId => (
        <li key={cardId}>
          <MemoryCardIdProvider id={cardId}>{children}</MemoryCardIdProvider>
        </li>
      ))}
    </ul>
  )
}
