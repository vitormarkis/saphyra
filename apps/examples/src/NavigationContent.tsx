import { NavLink } from "react-router-dom"
import { TextChart } from "./components/text-chart"
import { myRoutesManifest } from "./my-routes-manifest"
import { cn } from "./lib/cn"
import { capitalize } from "./lib/utils"
import { globalEvents } from "./global-events"

type NavigationContentProps = {}

const routes = ["/", ...myRoutesManifest.map(route => route.path)]

export function NavigationContent({}: NavigationContentProps) {
  return (
    <>
      <h3 className="font-bold text-normal leading-7">Examples:</h3>
      <TextChart.Wrapper className="px-2 py-1">
        <TextChart.Text className="text-xs">
          Explore <TextChart.Strong>Saphyra</TextChart.Strong> and how it helps
          solve many common challenges you face when building a feature.
        </TextChart.Text>
      </TextChart.Wrapper>
      <nav className="flex flex-col py-6 gap-1">
        {routes.map(route => (
          <NavLink
            to={route ?? ""}
            key={route}
            onClick={() => {
              globalEvents.emit("navigated_through_navlink", route ?? "")
            }}
            className={({ isActive }) =>
              cn(
                "hover:bg-gray-100 dark:hover:bg-gray-900 dark:hover:text-white w-full py-1 px-2 rounded-sm",
                isActive &&
                  "bg-blue-500 text-white hover:bg-blue-500 hover:text-white"
              )
            }
          >
            {route === "/"
              ? "Home"
              : capitalize(route?.replace("/", "").replaceAll("-", " "))}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
