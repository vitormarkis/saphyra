import React from "react"
import { cn } from "~/lib/utils"

export type IconCommentProps = React.ComponentPropsWithoutRef<"svg">

export const IconComment = React.forwardRef<
  React.ElementRef<"svg">,
  IconCommentProps
>(function IconCommentComponent({ className, ...props }, ref) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={cn("", className)}
      {...props}
    >
      <rect
        width={256}
        height={256}
        fill="none"
      />
      <path
        d="M79.93,211.11a96,96,0,1,0-35-35h0L32.42,213.46a8,8,0,0,0,10.12,10.12l37.39-12.47Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={16}
      />
    </svg>
  )
})
