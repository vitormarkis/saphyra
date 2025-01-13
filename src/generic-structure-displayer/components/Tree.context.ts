import { createContext } from "react"

type ITreeContext = {
  expandedNodes: Set<string>
  expandNode: (id: string) => void
  allExpanded?: boolean
}

export const TreeContext = createContext<ITreeContext>({} as ITreeContext)
