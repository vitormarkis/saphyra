import React from "react"
import { cn } from "~/lib/cn"

export type ButtonProps = React.ComponentPropsWithoutRef<"button">

export const Button = React.forwardRef<React.ElementRef<"button">, ButtonProps>(
  function ButtonComponent({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "h-9 px-3 rounded-md bg-blue-500 text-white border border-blue-600 hover:bg-blue-600 hover:border-blue-700 focus:outline-none font-medium text-sm transition-all",
          className
        )}
        {...props}
      />
    )
  }
)
