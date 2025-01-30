import "@blueprintjs/core/lib/css/blueprint.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "normalize.css"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"
import App from "./App.tsx"
import { RootLayoutWrapper } from "./Navigation.tsx"
import "./index.css"
import { myRoutesManifest } from "./my-routes-manifest.tsx"
import { Providers } from "./providers.tsx"
import { VideoPage } from "~/pages/VideoPage.tsx"
import { PostHogProvider, usePostHog } from "posthog-js/react"
import { Theme, themeStore } from "~/theme.tsx"
import { matches } from "lodash"

function onThemeChange(event: any, theme: string) {
  if (event.matches) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      themeStore.setState({ theme: "dark" })
    } else {
      document.documentElement.classList.remove("dark")
      themeStore.setState({ theme: "light" })
    }
  }
}

function ensureThemeChangeOnSystemChange(theme: string) {
  const mediaQuery = window.matchMedia(`(prefers-color-scheme: ${theme})`)
  mediaQuery.onchange = e => onThemeChange(e, theme)
  onThemeChange(mediaQuery, theme)
}

ensureThemeChangeOnSystemChange("light")
ensureThemeChangeOnSystemChange("dark")
onThemeChange({ matches: true }, "dark")

export const routesManifest = [
  {
    path: "/video",
    element: <VideoPage />,
  },
  {
    path: "/",
    element: (
      <Providers>
        <RootLayoutWrapper>
          <Outlet />
        </RootLayoutWrapper>
      </Providers>
    ),
    children: [
      {
        index: true,
        element: <App />,
      },
      ...myRoutesManifest,
    ],
  },
]

const router = createBrowserRouter(routesManifest)

createRoot(document.getElementById("root")!).render(
  <PostHog>
    <RouterProvider router={router} />
  </PostHog>
)

export type PostHogProps = {
  children: React.ReactNode
}

function PostHog({ children }: PostHogProps) {
  if (import.meta.env.DEV) return children

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        person_profiles: "always",
      }}
    >
      {children}
    </PostHogProvider>
  )
}
