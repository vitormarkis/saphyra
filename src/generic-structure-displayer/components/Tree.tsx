import { useContext } from "react"
import { ChildNode } from "../fn/types"
import { TreeContext } from "./Tree.context"

type TreeProps = ChildNode

export function Tree(childNode: TreeProps) {
  const { expandedNodes, allExpanded } = useContext(TreeContext)
  const isExpanded = allExpanded ?? expandedNodes.has(childNode.id)

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
            <Tree {...childNode} />
          </ul>
        ))}
    </div>
  )
}
