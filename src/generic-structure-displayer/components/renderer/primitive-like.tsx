import { cn } from "../../../lib/utils"
import { RendererContext } from "../../fn/types"
import { KeyContainer } from "./common/key-container"

type LabelPrimitiveLikeProps = { ctx: RendererContext }

export function LabelPrimitiveLike({ ctx }: LabelPrimitiveLikeProps) {
  const { key, isItem } = ctx
  return (
    <>
      {!isItem && (
        <>
          <KeyContainer>{key}</KeyContainer>
          <span>{" : "}</span>
        </>
      )}
      <span
        className={cn("whitespace-nowrap rounded-sm px-1 border", {
          "bg-yellow-50 text-yellow-800 border-yellow-700/20 dark:bg-yellow-800/20 dark:text-yellow-200/90 dark:border-yellow-600/40":
            ctx.type === "string",
          "bg-purple-50 text-purple-800 border-purple-700/20 dark:bg-purple-800/20 dark:text-purple-200/90 dark:border-purple-600/40":
            ctx.type === "null",
          "bg-amber-50 text-amber-800 border-amber-700/20 dark:bg-amber-800/20 dark:text-amber-200/90 dark:border-amber-600/40":
            ctx.type === "number",
        })}
      >
        {JSON.stringify(ctx.value, null, 2)}
      </span>
    </>
  )
}
