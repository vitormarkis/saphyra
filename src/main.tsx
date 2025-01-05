import "@blueprintjs/core/lib/css/blueprint.css"
import "normalize.css"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"
import { Providers } from "./providers.tsx"
import { GithubProfilePage } from "./pages/github-profile/page.tsx"
import { ChangeRolePage } from "./pages/change-role/page.tsx"

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Providers>
        <Outlet />
      </Providers>
    ),
    children: [
      {
        index: true,
        element: <App />,
      },
      {
        path: "/github-profile",
        element: <GithubProfilePage />,
      },
      {
        path: "/change-role",
        element: <ChangeRolePage />,
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />)
