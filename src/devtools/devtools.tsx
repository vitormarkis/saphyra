import { useEffect, useRef, useState, useSyncExternalStore } from "react"
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
  const [seeingTab, setSeeingTab] = useState(defaultTab)
  const [transitionPing, setTransitionPing] = useState(false)

  const saveCurrentTab = (tab: string) => {
    sessionStorage.setItem(`${pathname}.devtools-tab`, tab)
  }

  const state = useSyncExternalStore(
    cb => store.subscribe(cb),
    () => store.getState()
  )

  const prev_transitions_state = useRef<any>()
  const transitions_state = useSyncExternalStore(
    cb => store.transitions.subscribe(cb),
    () => store.transitions.state
  )

  const [transitionsExpandedNodes, setTransitionsExpandedNodes] = useState<
    Set<string>
  >(new Set())

  useEffect(() => {
    if (seeingTab === "transitions") return
    if (prev_transitions_state.current) {
      setTransitionPing(Object.keys(transitions_state.transitions).length > 0)
    }
    prev_transitions_state.current = true
  }, [transitions_state.transitions])

  return (
    <Tabs
      defaultValue={defaultTab}
      className="min-h-0 basis-0 grow"
      value={seeingTab}
      onValueChange={tab => {
        saveCurrentTab(tab)
        if (tab === "transitions") {
          setTransitionPing(false)
        }
        setSeeingTab(tab)
      }}
      style={{
        overflow: "unset",
      }}
    >
      <TabsList className="grow-0 basis-auto">
        <TabsTrigger value="state">State</TabsTrigger>
        <TabsTrigger
          value="transitions"
          className="relative"
        >
          {!!transitionPing && (
            <div className="absolute right-2 top-0 -translate-y-1/2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
            </div>
          )}
          Transitions
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="state"
        className="h-full"
      >
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
