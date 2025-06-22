import { createContext, Suspense, useContext, useMemo, useRef } from "react"

type SaphyraContextType = {
  promises: Map<string, Promise<any>>
}

export const SaphyraContext = createContext<SaphyraContextType | null>(null)

export function SaphyraProvider({ children }: { children: React.ReactNode }) {
  const promises = useRef<Map<string, Promise<any>>>(new Map()).current

  return (
    <SaphyraContext.Provider value={useMemo(() => ({ promises }), [promises])}>
      <Suspense>{children}</Suspense>
    </SaphyraContext.Provider>
  )
}

export const useSaphyra = () => {
  const context = useContext(SaphyraContext)
  if (!context) {
    throw new Error("useSaphyra must be used within a SaphyraProvider")
  }
  return context
}
