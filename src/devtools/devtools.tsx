import { useState, useSyncExternalStore } from "react"
import { StoreInstantiatorGeneric } from "../create-store/types"
import {
  GenericStructureDisplayer,
  GenericStructureDisplayerProps,
} from "../generic-structure-displayer/components/Root"

export type DevtoolsProps<
  T extends StoreInstantiatorGeneric = StoreInstantiatorGeneric,
> = {
  store: ReturnType<T>
} & Omit<GenericStructureDisplayerProps<T>, "source">

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { useLocation } from "react-router-dom"

export type DevtoolsPropsWithoutStore<T> = Omit<
  GenericStructureDisplayerProps<T>,
  "source"
>

export function Devtools<
  T extends StoreInstantiatorGeneric = StoreInstantiatorGeneric,
>({
  store,
  allNodes,
  onAllNodesChange,
  expandedNodes,
  onExpandNode,
  allExpanded,
}: DevtoolsProps<T>) {
  const { pathname } = useLocation()
  const defaultTab =
    sessionStorage.getItem(`${pathname}.devtools-tab`) ?? "state"

  const saveCurrentTab = (tab: string) => {
    sessionStorage.setItem(`${pathname}.devtools-tab`, tab)
  }

  const state = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getState()
  )

  const transitions_state = useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.state
  )

  const [transitionsExpandedNodes, setTransitionsExpandedNodes] = useState<
    Set<string>
  >(new Set())

  return (
    <Tabs
      defaultValue={defaultTab}
      className="min-h-0 basis-0  grow"
      onValueChange={saveCurrentTab}
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
