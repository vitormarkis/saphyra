import React, { memo, useContext } from "react"
import { RendererContext } from "../../fn/types"
import { LabelObjectLike } from "./object-like"
import { LabelPrimitiveLike } from "./primitive-like"
import { cn } from "~/lib/cn"
import { TreeContext } from "~/generic-structure-displayer/components/Tree.context"
import { IconCaret } from "~/generic-structure-displayer/components/IconCaret"
import { useContextSelector } from "use-context-selector"

type LabelGeneralProps = {
  ctx: RendererContext
}

export const LabelGeneral = memo(function LabelGeneralMemo({
  ctx,
}: LabelGeneralProps) {
  const { type } = ctx
  const isObject = type === "object" || type === "array"

  if (isObject) {
    return (
      <Wrapper ctx={ctx}>
        <LabelObjectLike ctx={ctx} />
      </Wrapper>
    )
  }

  return (
    <Wrapper ctx={ctx}>
      <LabelPrimitiveLike ctx={ctx} />
    </Wrapper>
  )
})

export type WrapperProps = React.ComponentPropsWithoutRef<"div"> & {
  ctx: RendererContext
}

export const Wrapper = React.forwardRef<React.ElementRef<"div">, WrapperProps>(
  function WrapperComponent({ className, ctx, children, ...props }, ref) {
    const childNode = ctx.node
    const expandNode = useContextSelector(TreeContext, s => s.expandNode)
    const isExpanded = useContextSelector(
      TreeContext,
      ({ expandedNodes, allExpanded }) => {
        return allExpanded != null
          ? allExpanded
          : expandedNodes.has(childNode.id)
      }
    )
    const hasChildNodes = ctx.node.childNodes != null

    const isObject = ctx.type === "object" || ctx.type === "array"

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-5 items-center gap-1",
          !isObject && "ml-6",
          className
        )}
        {...props}
      >
        <div
          role="button"
          className={cn(
            "aspect-square grid place-content-center transition-all h-full",
            hasChildNodes && "dark:hover:bg-gray-800 hover:bg-gray-200",
            !isObject && "hidden"
          )}
          onClick={expandNode.bind(null, childNode.id)}
        >
          {hasChildNodes && (
            <div
              data-state={isExpanded ? "expanded" : "collapsed"}
              className="ease-[0,1,0.5,1] data-[state=collapsed]:-rotate-90 transition-all duration-300 select-none"
            >
              <IconCaret className="h-3 w-3" />
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }
)
