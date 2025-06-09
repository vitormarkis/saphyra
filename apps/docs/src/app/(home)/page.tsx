import { cn } from "fumadocs-ui/utils/cn"
import React, { ComponentProps, ComponentRef } from "react"
import st from "./page.module.css"
import { Button } from "../components/button"

export default function HomePage() {
  return (
    <main className="size-full flex-1 h-full grid place-items-center">
      <div className="flex flex-col relative">
        <InterrogationLight className="absolute left-0 bottom-0 right-0 translate-y-[70%]" />
        <h1 className="text-6xl text-center font-bold relative">
          <div className="pointer-events-none absolute bg-gradient-to-r  from-fuchsia-500/30 dark:from-black to-sky-300/50 dark:to-purple-900/50 left-1/2 -translate-x-1/2 translate-y-[20%] dark:w-full w-[150%] size-full blur-[120px]" />
          <EnhanceText className="relative z-10">
            Async State Management
            <br /> Done the Right Way
          </EnhanceText>
        </h1>
        <div className="pt-4 flex justify-center">
          <p className="text-center text-gray-500 dark:text-gray-200 text-lg max-w-[30rem]">
            A declarative state management with first class support for async
            behavior.
          </p>
        </div>

        {/* <h1 className="text-6xl text-center">
          Modern and Declarative
          <br />
          <EnhanceText>Async</EnhanceText> State Management
        </h1> */}
        <div className="flex gap-8 justify-center pt-8">
          <Button>Getting Started</Button>
          <Button>Documentation</Button>
        </div>
      </div>
    </main>
  )
}

type EnhanceTextProps = React.ComponentProps<"span">

function EnhanceText({ className, ...props }: EnhanceTextProps) {
  return (
    <span
      className={cn(st["enhance-text"], "font-black", className)}
      {...props}
    />
  )
}

type InterrogationLightProps = ComponentProps<"div">

function InterrogationLight({ className, ...props }: InterrogationLightProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center overflow-hidden pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="relative flex w-full flex-col items-center">
        <div className="absolute left-1/2 bottom-0 h-[7rem] w-[13rem] -translate-x-1/2 translate-y-1/2 rounded-full bg-slate-500/20 dark:bg-slate-400/10 blur-[60px]"></div>
        <div className="relative mb-4 h-[9rem] w-[7rem]"></div>
      </div>
      <div className="h-[1px] w-[90%] bg-gradient-to-r from-transparent via-slate-300/70 dark:via-slate-800/10 to-transparent"></div>
    </div>
  )
}
