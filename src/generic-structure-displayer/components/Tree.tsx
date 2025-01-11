import { useContext } from "react"
import { ChildNode } from "../fn/types"
import { TreeContext } from "./Tree.context"
import { IconCaret } from "./IconCaret"
import { cn } from "../../lib/utils"

type TreeProps = ChildNode

export function Tree(childNode: TreeProps) {
  const { expandedNodes, expandNode } = useContext(TreeContext)
  const isExpanded = expandedNodes.has(childNode.id)
  const hasChildNodes = childNode.childNodes != null

  return (
    <div className="flex flex-col text-xs gap-1">
      <div className="flex h-5">
        <div
          role="button"
          className={cn(
            "aspect-square grid place-content-center transition-all",
            hasChildNodes && "dark:hover:bg-gray-800 hover:bg-gray-200"
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
        {childNode.label}
      </div>
      {isExpanded && (
        <ul className="flex flex-col ml-5 gap-1">
          {childNode.childNodes != null &&
            childNode.childNodes.length > 0 &&
            childNode.childNodes.map(childNode => (
              <Tree
                key={childNode.id}
                {...childNode}
              />
            ))}
        </ul>
      )}
    </div>
  )
}
