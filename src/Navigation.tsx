import { PropsWithChildren } from "react"
import { capitalize, cn } from "./lib/utils"
import { myRoutesManifest } from "./my-routes-manifest"
import { NavLink } from "react-router-dom"

type RootLayoutWrapperProps = {} & PropsWithChildren

const routes = myRoutesManifest.map(route => route.path)

export function RootLayoutWrapper({ children }: RootLayoutWrapperProps) {
  return (
    <div className="flex gap-4 h-screen p-4 bg-gray-50">
      <div className="flex flex-col text-sm basis-[320px]">
        <div className="border border-dashed bg-white h-full flex flex-col px-4 py-6 text-sm rounded-md">
          <h3 className="font-bold text-normal">Showcases</h3>
          <nav className="flex flex-col py-6 gap-1">
            {routes.map(route => (
              <NavLink
                to={route}
                key={route}
                className={({ isActive }) =>
                  cn(
                    "hover:bg-gray-100 w-full py-1 px-2 rounded-sm",
                    isActive && "bg-blue-500 text-white hover:bg-blue-500 hover:text-white"
                  )
                }
              >
                {capitalize(route?.replace("/", "").replaceAll("-", " "))}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="flex-1 flex flex-col text-sm min-w-[320px]">
        <div className="border border-dashed bg-white h-full flex flex-col px-4 py-6 text-sm rounded-md">
          {children}
        </div>
      </div>
    </div>
  )
}
