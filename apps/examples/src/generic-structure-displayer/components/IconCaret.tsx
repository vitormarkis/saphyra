import { ComponentPropsWithoutRef } from "react"

type IconCaretProps = ComponentPropsWithoutRef<"svg">

export function IconCaret(props: IconCaretProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
    >
      <rect
        width={256}
        height={256}
        fill="none"
      />
      <polyline
        points="208 96 128 176 48 96"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={16}
      />
    </svg>
  )
}
