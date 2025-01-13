import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "~/lib/utils"

export type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(function TabsComponent(
  { className, ...props },
  ref
) {
  return (
    <TabsPrimitive.Root
      ref={ref}
      className={cn(
        "border border-gray-200 dark:border-gray-800 flex flex-col flex-1 overflow-hidden h-full",
        className
      )}
      {...props}
    />
  )
})

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-6 items-center justify-start bg-gray-200 flex-1 shrink-0 dark:bg-gray-800",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3 h-full text-sm transition-all disabled:pointer-events-none disabled:opacity-50 border-none outline-none",
      "data-[state=active]:bg-white text-gray-600 bg-gray-200 data-[state=active]:text-black",
      "dark:data-[state=active]:bg-black dark:text-gray-400 dark:bg-gray-800 dark:data-[state=active]:text-white",
      className
    )}
    {...props}
    asChild
  >
    <div
      role="button"
      className="outline-none"
    >
      {props.children}
    </div>
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-2 outline-none px-1 py-2 overflow-auto", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
