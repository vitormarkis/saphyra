import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createJsonToNode } from "../fn/json-to-node"
import { Renderer } from "../fn/types"
import { Tree } from "./Tree"
import { TreeContext } from "./Tree.context"
import { LabelGeneral } from "./renderer/label-general"
import { checkHasChangedSetItem } from "../fn/check-has-changed-set-item"

export type GenericStructureDisplayerProps<T> = {
  source: T
  expandedNodes?: Set<string>
  onExpandNode?: (nodeId: string) => void
  allNodes?: Set<string>
  onAllNodesChange?: (allNodes: Set<string>) => void
}

const renderer: Renderer = ctx => {
  let { node } = ctx

  node = {
    ...node,
    label: <LabelGeneral ctx={ctx} />,
  }

  return node
}

export const GenericStructureDisplayer = memo(
  <T,>({
    source,
    expandedNodes: expandedNodesProp,
    allNodes: allNodesProp,
    onExpandNode,
    onAllNodesChange,
  }: GenericStructureDisplayerProps<T>) => {
    const [expandedNodesInner, setExpandedNodesInner] = useState<Set<string>>(new Set())
    const [allNodesInner, setAllNodes] = useState<Set<string>>(new Set())
    const allNodes = allNodesProp ?? allNodesInner
    const prevAllNodes = useRef(allNodes)
    const nodes = useMemo(() => {
      return createJsonToNode({
        renderer: ctx => {
          setAllNodes(allNodes => {
            const newAllNodes = new Set(allNodes)
            newAllNodes.add(ctx.node.id)
            return newAllNodes
          })
          return renderer(ctx)
        },
        checkIsObject: (item): item is Record<string, any> => {
          if (item == null) return false
          return typeof item === "object"
        },
      })(source)
    }, [source])

    useEffect(() => {
      const hasChangedItem = checkHasChangedSetItem(allNodes, prevAllNodes.current)
      if (!hasChangedItem) return
      onAllNodesChange?.(allNodes)
      return () => {
        prevAllNodes.current = allNodes
      }
    }, [allNodes, onAllNodesChange])

    const expandNode = useCallback(
      (id: string) => {
        onExpandNode?.(id)
        setExpandedNodesInner(expandedNodes => {
          const newExpandedNodes = new Set(expandedNodes)
          if (newExpandedNodes.has(id)) {
            newExpandedNodes.delete(id)
            return newExpandedNodes
          }

          newExpandedNodes.add(id)
          return newExpandedNodes
        })
      },
      [setExpandedNodesInner]
    )

    return (
      <TreeContext.Provider
        value={{
          expandedNodes: expandedNodesProp ?? expandedNodesInner,
          expandNode,
        }}
      >
        <ul className="flex gap-1 flex-col overflow-auto">
          {nodes.map(node => (
            <li key={node.id}>
              <Tree {...node} />
            </li>
          ))}
        </ul>
      </TreeContext.Provider>
    )
  }
)
