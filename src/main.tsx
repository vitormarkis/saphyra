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

export const routesManifest = [
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

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />)
