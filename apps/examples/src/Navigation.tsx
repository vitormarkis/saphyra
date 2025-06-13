import { Icon } from "@blueprintjs/core"
import { PropsWithChildren, useEffect, useState } from "react"
import { cn } from "./lib/cn"
import { NavigationContent } from "./NavigationContent"
import { MobileNavigation } from "./MobileNavigation"

type RootLayoutWrapperProps = {} & PropsWithChildren

export function RootLayoutWrapper({ children }: RootLayoutWrapperProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  useEffect(() => {
    Object.assign(window, {
      toggleSidebar: () => setIsSidebarVisible(s => !s),
    })
  }, [])

  return (
    <div className="h-screen grid grid-rows-[auto,1fr] sm:grid-rows-1">
      <header className="flex sm:hidden container-1 border-b border-gray-800 h-12 w-full px-2">
        <MobileNavigation>
          <div
            role="button"
            className="h-full aspect-square hover:bg-gray-800 grid place-items-center"
          >
            <Icon icon="menu" />
          </div>
        </MobileNavigation>
      </header>
      <div className="container-1 flex gap-4 h-full p-4 overflow-y-hidden">
        <div
          className={cn(
            "flex-col text-sm basis-[250px] hidden sm:flex",
            !isSidebarVisible && "hidden sm:hidden"
          )}
        >
          <div className="border border-dashed container-2 h-full flex flex-col px-4 py-6 text-sm rounded-md ">
            <NavigationContent />
          </div>
        </div>
        <div className="flex-1 flex flex-col text-sm min-w-[250px]">
          <div className="border border-dashed container-2 h-full grid grid-cols-1 px-4 py-6 text-sm rounded-md @container overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
