import { useState, useSyncExternalStore } from "react"
import { StoreInstantiatorGeneric } from "../create-store/types"
import {
  GenericStructureDisplayer,
  GenericStructureDisplayerProps,
} from "../generic-structure-displayer/components/Root"

export type DevtoolsProps<T extends StoreInstantiatorGeneric = StoreInstantiatorGeneric> = {
  store: ReturnType<T>
} & Omit<GenericStructureDisplayerProps<T>, "source">

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"

export type DevtoolsPropsWithoutStore<T> = Omit<GenericStructureDisplayerProps<T>, "source">

export function Devtools<T extends StoreInstantiatorGeneric = StoreInstantiatorGeneric>({
  store,
  allNodes,
  onAllNodesChange,
  expandedNodes,
  onExpandNode,
  allExpanded,
}: DevtoolsProps<T>) {
  const state = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getState()
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
          allExpanded={allExpanded}
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
