import { Spinner } from "@blueprintjs/core"
import { ComponentProps } from "react"

type CenteredSpinnerProps = ComponentProps<typeof Spinner>

export function CenteredSpinner(props: CenteredSpinnerProps) {
  return (
    <div className="h-full w-full flex items-center justify-center flex-col gap-2 text-center">
      <Spinner {...props} />
    </div>
  )
}
