import { PropsWithChildren } from "react"

type KeyContainerProps = PropsWithChildren

export function KeyContainer({ children }: KeyContainerProps) {
  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 text-xs/none h-full rounded-sm px-2 items-center justify-center">
      {children}
    </div>
  )
}
