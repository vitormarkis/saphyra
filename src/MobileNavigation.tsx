import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet"
import { NavigationContent } from "./NavigationContent"
import { useEffect, useState } from "react"
import { globalEvents } from "./global-events"

type MobileNavigationProps = {
  children: React.ReactNode
}

export function MobileNavigation({ children }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    return globalEvents.on("navigated_through_navlink", () => {
      setIsOpen(false)
    })
  }, [setIsOpen])

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left">
        <NavigationContent />
      </SheetContent>
    </Sheet>
  )
}
