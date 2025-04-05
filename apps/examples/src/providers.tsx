import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Toaster } from "sonner"
import { GoToSourceButton } from "./go-to-source-button"
import { Analytics } from "@vercel/analytics/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { queryClient } from "~/query-client"

type ProvidersProps = {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const navigate = useNavigate()

  useEffect(() => {
    Object.assign(window, { navigate })
  }, [])

  const displayGoToSourceButton = !(
    import.meta.env.VITE_SHOW_GO_TO_SOURCE === "false"
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {displayGoToSourceButton && <GoToSourceButton />}
      <Analytics />
      <Toaster
        toastOptions={{
          className: "border",
          classNames: {
            error: "bg-red-600 text-white dark:border-red-400 border-red-700",
            success:
              "bg-green-400 text-black dark:border-green-300 border-green-500",
            warning:
              "bg-yellow-400 text-black dark:border-yellow-300 border-yellow-500",
            info: "bg-blue-400 text-white dark:border-blue-300 border-blue-500",
          },
        }}
      />
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
