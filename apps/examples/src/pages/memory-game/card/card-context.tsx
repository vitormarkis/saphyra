import { createContext, useContext } from "react"

export const MemoryCardIdContext = createContext<string>("")

type MemoryCardIdProviderProps = {
  id: string
  children?: React.ReactNode
}

export function MemoryCardIdProvider({
  children,
  id,
}: MemoryCardIdProviderProps) {
  return (
    <MemoryCardIdContext.Provider value={id}>
      {children}
    </MemoryCardIdContext.Provider>
  )
}

export function useMemoryCardId() {
  const ctx = useContext(MemoryCardIdContext)
  if (!ctx) throw new Error(`[MemoryCardIdContext] No context provided.`)
  return ctx
}
