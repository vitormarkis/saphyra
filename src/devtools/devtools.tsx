import { useState, useSyncExternalStore } from "react"
import { GenericStore, TransitionsExtension } from "../create-store/types"
import {
  GenericStructureDisplayer,
  GenericStructureDisplayerProps,
} from "../generic-structure-displayer/components/Root"

export type DevtoolsProps<T> = {
  store: GenericStore<any, any> & TransitionsExtension
} & Omit<GenericStructureDisplayerProps<T>, "source">

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"

export type DevtoolsPropsWithoutStore<T> = Omit<GenericStructureDisplayerProps<T>, "source">

export function Devtools<T>({
  store,
  allNodes,
  onAllNodesChange,
  expandedNodes,
  onExpandNode,
}: DevtoolsProps<T>) {
  const state = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.state
  )

  const transitions_state = useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.state
  )

  const [transitionsExpandedNodes, setTransitionsExpandedNodes] = useState<Set<string>>(new Set())

  return (
    <Tabs
      defaultValue="state"
      className="min-h-0 basis-0  grow"
    >
      <TabsList className="grow-0 basis-auto">
        <TabsTrigger value="state">State</TabsTrigger>
        <TabsTrigger value="transitions">Transitions</TabsTrigger>
      </TabsList>
      <TabsContent value="state">
        <GenericStructureDisplayer
          source={state}
          allNodes={allNodes}
          onAllNodesChange={onAllNodesChange}
          expandedNodes={expandedNodes}
          onExpandNode={onExpandNode}
        />
      </TabsContent>
      <TabsContent value="transitions">
        <GenericStructureDisplayer
          expandedNodes={transitionsExpandedNodes}
          onAllNodesChange={setTransitionsExpandedNodes}
          source={transitions_state}
        />
      </TabsContent>
    </Tabs>
  )
}
