import React from "react"
import { cn } from "~/lib/utils"

export type IconHeartProps = React.ComponentPropsWithoutRef<"svg">

export const IconHeart = React.forwardRef<
  React.ElementRef<"svg">,
  IconHeartProps
>(function IconHeartComponent({ className, ...props }, ref) {
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
        d="M128,224S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32a54,54,0,0,1,54,54C232,168,128,224,128,224Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={16}
      />
    </svg>
  )
})
