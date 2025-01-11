import { RendererContext } from "../../fn/types"
import { LabelObjectLike } from "./object-like"
import { LabelPrimitiveLike } from "./primitive-like"

type LabelGeneralProps = {
  ctx: RendererContext
}

export function LabelGeneral({ ctx }: LabelGeneralProps) {
  const { type } = ctx
  const isObject = type === "object" || type === "array"

  if (isObject) {
    return <LabelObjectLike ctx={ctx} />
  }

  return <LabelPrimitiveLike ctx={ctx} />
}
