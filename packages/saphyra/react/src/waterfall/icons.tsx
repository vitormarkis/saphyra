import React from "react"

type IconProps = {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function ChevronUpIcon({ size = 16, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}
