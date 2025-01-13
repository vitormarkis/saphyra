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
        className={cn("whitespace-nowrap rounded-sm px-1 ", {
          "bg-rose-50 text-rose-400 dark:bg-sky-200/5 dark:text-sky-400/90 dark:border-sky-700/20":
            ctx.type === "string",
          "bg-purple-50 text-purple-800 border-purple-700/20 dark:bg-purple-800/20 dark:text-purple-200/90  dark:border-purple-700/20":
            ctx.type === "null",
          "bg-blue-50 text-blue-800 border-blue-700/20 dark:bg-purple-800/20 dark:text-purple-200/90 dark:border-purple-700/20":
            ctx.type === "number" || ctx.type === "boolean",
        })}
      >
        {JSON.stringify(ctx.value, null, 2)}
      </span>
    </>
  )
}
