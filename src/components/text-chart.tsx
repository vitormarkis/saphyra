import React from "react"
import { cn } from "~/lib/cn"

type WrapperProps = React.ComponentPropsWithoutRef<"div">

const Wrapper = React.forwardRef<React.ElementRef<"div">, WrapperProps>(
  function WrapperComponent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-stone-300/10 dark:bg-stone-700/10 border px-4 py-2 rounded-md border-stone-500/20",
          className
        )}
        {...props}
      />
    )
  }
)

type TitleProps = React.ComponentPropsWithoutRef<"h3">

const Title = React.forwardRef<React.ElementRef<"h3">, TitleProps>(
  function TitleComponent({ className, ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-lg font-bold dark:text-stone-200 text-stone-600",
          className
        )}
        {...props}
      />
    )
  }
)

type TextProps = React.ComponentPropsWithoutRef<"p">

const Text = React.forwardRef<React.ElementRef<"p">, TextProps>(
  function TextComponent({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          "dark:[&_i]:text-stone-300/50 dark:text-stone-300  [&_i]:text-stone-800/50 text-stone-500",
          className
        )}
        {...props}
      />
    )
  }
)

type StrongProps = React.ComponentPropsWithoutRef<"strong">

const Strong = React.forwardRef<React.ElementRef<"strong">, StrongProps>(
  function TextStrongComponent({ className, ...props }, ref) {
    return (
      <strong
        ref={ref}
        className={cn(
          "dark:[&_strong]:text-white [&_strong]:text-stone-700",
          className
        )}
        {...props}
      />
    )
  }
)

type ItalicProps = React.ComponentPropsWithoutRef<"i">

const Italic = React.forwardRef<React.ElementRef<"i">, ItalicProps>(
  function TextItalicComponent({ className, ...props }, ref) {
    return (
      <i
        ref={ref}
        className={cn("", className)}
        {...props}
      />
    )
  }
)

export type ImportantProps = React.ComponentPropsWithoutRef<"strong">

export const Important = React.forwardRef<
  React.ElementRef<"strong">,
  ImportantProps
>(function ImportantComponent({ className, ...props }, ref) {
  return (
    <strong
      ref={ref}
      className={cn("text-lime-400 dark:text-lime-400", className)}
      {...props}
    />
  )
})

export const TextChart = {
  Wrapper,
  Title,
  Text,
  Strong,
  Italic,
  Important,
}
