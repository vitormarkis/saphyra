import { Button, Icon } from "@blueprintjs/core"
import twc from "tailwindcss/colors"
import React from "react"
import { extractErrorMessage } from "~/lib/extract-error-message"
import { cn } from "~/lib/cn"

type CenteredErrorProps = {
  message: string
  title?: string
} & (
  | {
      retryFn: () => void
      retryComponent?: undefined
      loading?: boolean
    }
  | {
      retryFn?: undefined
      retryComponent: () => React.ReactNode
      loading?: undefined
    }
)

export function CenteredError({
  message,
  loading = false,
  title = "Something went wrong!",
  ...rest
}: CenteredErrorProps) {
  return (
    <div className="h-full w-full flex items-center justify-center flex-col gap-2 text-center">
      <div className="flex items-center gap-3">
        <Icon
          icon="cross-circle"
          color={twc.red[400]}
          size={24}
        />
        <Title className="text-xl text-red-400">{title}</Title>
      </div>
      <Text className="bg-red-200/60 dark:bg-red-800/20 px-3 py-1 rounded-lg text-balance text-red-800/90 dark:text-red-400/80 max-w-[50%]">
        {message}
      </Text>
      {rest.retryComponent && <rest.retryComponent />}
      {rest.retryFn && (
        <div className="pt-4">
          <Button
            loading={loading}
            onClick={rest.retryFn}
          >
            <Icon
              icon="refresh"
              size={12}
            />
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

type CenteredErrorUnknownProps = Omit<CenteredErrorProps, "message"> & {
  error: unknown
}

export function CenteredErrorUnknown({
  error,
  ...rest
}: CenteredErrorUnknownProps) {
  return (
    <CenteredError
      message={extractErrorMessage(error)}
      {...(rest as any)}
    />
  )
}

export type TitleProps = React.ComponentPropsWithoutRef<"h3">

export const Title = React.forwardRef<React.ElementRef<"h3">, TitleProps>(
  function TitleComponent({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn("", className)}
        {...props}
      />
    )
  }
)

export type TextProps = React.ComponentPropsWithoutRef<"span">

export const Text = React.forwardRef<React.ElementRef<"span">, TextProps>(
  function TextComponent({ className, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn("", className)}
        {...props}
      />
    )
  }
)
