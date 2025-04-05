import { RendererContext } from "../../fn/types"
import { KeyContainer } from "./common/key-container"

type LabelObjectLikeProps = {
  ctx: RendererContext
}

export function LabelObjectLike({ ctx }: LabelObjectLikeProps) {
  const { key } = ctx
  return (
    <>
      <div className="flex gap-1 h-full font-mono">
        <KeyContainer>{key}</KeyContainer>
      </div>
    </>
  )
}
