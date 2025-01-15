import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Toaster } from "sonner"
import { GoToSourceButton } from "./go-to-source-button"
import { Analytics } from "@vercel/analytics/react"

type ProvidersProps = {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const navigate = useNavigate()

  useEffect(() => {
    Object.assign(window, { navigate })
  }, [])

  const displayGoToSourceButton = !(import.meta.env.VITE_SHOW_GO_TO_SOURCE === "false")

  return (
    <>
      {children}
      <Toaster />
      {displayGoToSourceButton && <GoToSourceButton />}
      <Analytics />
    </>
  )
}
