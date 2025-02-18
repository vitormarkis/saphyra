import { createContext } from "use-context-selector"

type TreeContextState = {
  expandedNodes: Set<string>
  expandNode: (id: string) => void
  allExpanded?: boolean
}

export const TreeContext = createContext<TreeContextState>(
  {} as TreeContextState
)
