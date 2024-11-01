import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import { Toaster } from "sonner"
import "normalize.css"
import "@blueprintjs/core/lib/css/blueprint.css"
// include blueprint-icons.css for icon font support
import "@blueprintjs/icons/lib/css/blueprint-icons.css"

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
)
