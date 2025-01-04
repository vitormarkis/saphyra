import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Toaster } from "sonner"

type ProvidersProps = {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const navigate = useNavigate()

  useEffect(() => {
    Object.assign(window, { navigate })
  }, [])

  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
