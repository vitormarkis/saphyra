import React from "react"
import { cn } from "~/lib/cn"

type ButtonProps = React.ComponentPropsWithoutRef<"button">

export const Button = React.forwardRef<React.ElementRef<"button">, ButtonProps>(
  function ButtonComponent({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "bg-blue-500 dark:bg-blue-600 text-white border border-blue-600 dark:border-blue-700 hover:bg-blue-600 dark:hover:bg-blue-700 hover:border-blue-700 dark:hover:border-blue-800 focus:outline-none font-medium text-sm transition-[background-color] px-4 h-7 rounded-sm outline-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 dark:disabled:hover:bg-blue-600 disabled:hover:border-blue-600 dark:disabled:hover:border-blue-700;",
          className
        )}
        {...props}
      />
    )
  }
)
