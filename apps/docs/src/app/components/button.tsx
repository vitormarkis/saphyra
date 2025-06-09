import React from "react"
import { cn } from "fumadocs-ui/utils/cn"

export type ButtonProps = React.ComponentPropsWithoutRef<"button">

export const Button = React.forwardRef<React.ElementRef<"button">, ButtonProps>(
  function ButtonComponent({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "h-9 bg-blue-500 px-4 rounded-md text-sm hover:bg-blue-600 cursor-pointer text-white",
          className
        )}
        {...props}
      />
    )
  }
)
