import { memo } from "react"
import { ChildNode } from "../fn/types"
import { TreeContext } from "./Tree.context"
import { useContextSelector } from "use-context-selector"

type TreeProps = {
  node: ChildNode
}

export const Tree = memo(function MemoTree({ node: childNode }: TreeProps) {
  const isExpanded = useContextSelector(
    TreeContext,
    ({ expandedNodes, allExpanded }) => {
      return allExpanded != null ? allExpanded : expandedNodes.has(childNode.id)
    }
  )

  return (
    <div className="flex flex-col text-xs gap-1 cursor-default">
      {childNode.label}
      {isExpanded &&
        childNode.childNodes != null &&
        childNode.childNodes.length > 0 &&
        childNode.childNodes.map(childNode => (
          <ul
            key={childNode.id}
            className="flex flex-col gap-1 ml-6"
          >
            <Tree node={childNode} />
          </ul>
        ))}
    </div>
  )
})

Tree.displayName = "Tree"
