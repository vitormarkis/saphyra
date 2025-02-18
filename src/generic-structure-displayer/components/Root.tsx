import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createJsonToNode } from "../fn/json-to-node"
import { ChildNode, Renderer } from "../fn/types"
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
  allExpanded?: boolean
}

let STORE = new Map<string, ChildNode>()
let STOREVALUES = new Map<string, any>()

Object.assign(window, { STORE, STOREVALUES })

const renderer: Renderer = ctx => {
  const currValue = ctx.value
  const memoValue = STOREVALUES.get(ctx.path ?? "root")
  const isSameValue = Object.is(currValue, memoValue)
  const memoedNode = STORE.get(ctx.path ?? "root")
  if (isSameValue && memoedNode) return memoedNode

  let { node } = ctx

  node = {
    ...node,
    label: <LabelGeneral ctx={ctx} />,
  }

  STOREVALUES.set(ctx.path ?? "root", currValue)
  STORE.set(ctx.path ?? "root", node)
  return node
}

export const GenericStructureDisplayer = memo(
  <T,>({
    source,
    expandedNodes: expandedNodesProp,
    allNodes: allNodesProp,
    onExpandNode,
    onAllNodesChange,
    allExpanded,
  }: GenericStructureDisplayerProps<T>) => {
    const [expandedNodesInner, setExpandedNodesInner] = useState<Set<string>>(
      new Set()
    )
    const [allNodesInner, setAllNodes] = useState<Set<string>>(new Set())
    const allNodes = allNodesProp ?? allNodesInner
    const prevAllNodes = useRef(allNodes)
    const nodes = useMemo(() => {
      const jsonToNode = createJsonToNode({
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
      })
      return jsonToNode(source)
    }, [source])

    useEffect(() => {
      const hasChangedItem = checkHasChangedSetItem(
        allNodes,
        prevAllNodes.current
      )
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
        value={useMemo(
          () => ({
            expandedNodes: expandedNodesProp ?? expandedNodesInner,
            expandNode,
            allExpanded,
          }),
          [expandedNodesInner, expandNode, allExpanded]
        )}
      >
        <ul className="flex gap-1 flex-col overflow-auto h-full">
          {nodes.map(node => (
            <li key={node.id}>
              <Tree node={node} />
            </li>
          ))}
        </ul>
      </TreeContext.Provider>
    )
  }
)
