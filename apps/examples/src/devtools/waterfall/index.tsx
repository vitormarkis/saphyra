import {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { newWaterfallStore, WaterfallState, WaterfallStore, WF } from "./store"
import { cn } from "~/lib/cn"
import { SomeStoreGeneric } from "saphyra"
import { BarSorters } from "./sorters"
import { ChevronUp } from "lucide-react"
import React from "react"
import ReactDOM from "react-dom"
import { cva, type VariantProps } from "class-variance-authority"
import "./waterfall.css"

const WaterfallContext = createContext<{
  extractErrorMessage?: (error: unknown) => string
} | null>(null)

type WaterfallProps = {
  store: SomeStoreGeneric
  extractErrorMessage?: (error: unknown) => string
}

export function Waterfall({ store, extractErrorMessage }: WaterfallProps) {
  const [waterfallStore, resetStore, isLoading] = useNewStore(() =>
    newWaterfallStore({
      bars: [],
      distance: 500,
      clearTimeout: 1000,
    })
  )

  useEffect(() =>
    store.internal.events.on(
      "new-transition",
      ({ transitionName, id, label }) => {
        waterfallStore.dispatch({
          type: "add-bar",
          payload: { transitionName, id, label },
        })
      }
    )
  )

  useEffect(() =>
    store.internal.events.on(
      "transition-completed",
      ({ id, status, error }) => {
        waterfallStore.dispatch({
          type: "end-bar",
          payload: { id, status, error },
        })
      }
    )
  )

  return (
    <WaterfallContext.Provider value={{ extractErrorMessage }}>
      <WF.Context.Provider value={[waterfallStore, resetStore, isLoading]}>
        <div className="grid grid-rows-[auto_1fr] gap-1 h-full">
          <WaterfallController />
          <WaterfallContent />
        </div>
      </WF.Context.Provider>
    </WaterfallContext.Provider>
  )
}

type WaterfallControllerProps = {}

export function WaterfallController({}: WaterfallControllerProps) {
  const distance = WF.useCommittedSelector(s => s.distance)
  const query = WF.useCommittedSelector(s => s.query)
  const [localDistance, setLocalDistance] = useReducer(
    (distance: number, newDistance: number) => {
      if (isNaN(newDistance)) return distance
      if (newDistance > 5_000) return distance
      if (newDistance < 0) return distance
      return newDistance
    },
    distance
  )

  const clearTimeout = WF.useCommittedSelector(s => s.clearTimeout)
  const [localClearTimeout, setLocalClearTimeout] = useReducer(
    (clearTimeout: number, newClearTimeout: number) => {
      if (isNaN(newClearTimeout)) return clearTimeout
      if (newClearTimeout > 5_000) return clearTimeout
      if (newClearTimeout < 0) return clearTimeout
      return newClearTimeout
    },
    clearTimeout
  )

  const [waterfallStore] = WF.useStore()

  return (
    <div className="flex justify-between gap-2">
      <div className="flex gap-2 flex-1 pl-1">
        <input
          type="text"
          value={query}
          onChange={e => {
            waterfallStore.dispatch({
              type: "filter",
              payload: {
                query: e.target.value,
              },
            })
          }}
          className="w-full "
          placeholder="Transition name"
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={localClearTimeout}
          onChange={e => {
            setLocalClearTimeout(Number(e.target.value))
          }}
          className="tabular-nums"
          style={{
            // @ts-ignore
            fieldSizing: "content",
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              waterfallStore.setState({
                clearTimeout: localClearTimeout,
              })
            }
          }}
        />
        <input
          type="text"
          value={localDistance}
          onChange={e => {
            setLocalDistance(Number(e.target.value))
          }}
          className="tabular-nums"
          style={{
            // @ts-ignore
            fieldSizing: "content",
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              waterfallStore.setState({
                distance: localDistance,
              })
            }
          }}
        />

        <div className=" border bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800/70 p-0.5">
          <div
            role="button"
            className="h-6 px-2 grid place-items-center aspect-square  hover:cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
            onClick={() => {
              waterfallStore.dispatch({
                type: "reset",
              })
            }}
          >
            Clear
          </div>
        </div>
      </div>
    </div>
  )
}

function WaterfallContent() {
  const [waterfallStore] = WF.useStore()
  const displayingBarsIdList = WF.useCommittedSelector(s =>
    s.getDisplayingBarsIdList()
  )

  const [seeingElement, hover] = useState<string | null>(null)

  useEffect(() => {
    Object.assign(window, { waterfallStore })
  }, [])

  const updateConfig = useCallback(() => {
    waterfallStore.dispatch({
      type: "refresh",
    })

    if (waterfallStore.state.getIsSomeRunning()) {
      waterfallStore.uncontrolledState.animationFrame =
        requestAnimationFrame(updateConfig)
    }
  }, [waterfallStore])

  const lines = WF.useCommittedSelector(s => s.getLines())

  const tooltipRef = useRef<HTMLDivElement>(null)
  useMouse({
    onPosition({ x, y }) {
      if (!tooltipRef.current) return
      y = y - 10
      tooltipRef.current.style.transform = `translate3d(${x}px, ${y}px, 0px)`
    },
  })

  const rowsAmount =
    displayingBarsIdList.length > 0 ? displayingBarsIdList.length + 2 : 0

  useEffect(() => {
    if (displayingBarsIdList.length === 0) return
    waterfallStore.uncontrolledState.animationFrame =
      requestAnimationFrame(updateConfig)

    return () => {
      const { animationFrame } = waterfallStore.uncontrolledState
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [updateConfig, displayingBarsIdList.length])

  return (
    <div className="border border-gray-200 dark:border-gray-800/70 p-0.5 bg-gray-100 dark:bg-gray-900 overflow-y-auto overflow-x-hidden">
      <div className="grid grid-cols-[auto_1fr] gap-0.5">
        <div className="grid grid-cols-subgrid col-span-2 row-span-1 gap-0.5">
          <SorterHeader property="transitionName">name</SorterHeader>
          <SorterHeader property="startedAt">timing</SorterHeader>
        </div>
        <div className="contents">
          <div
            className="grid grid-cols-subgrid grid-rows-subgrid row-start-2 "
            style={{ gridRowEnd: rowsAmount }}
          >
            {displayingBarsIdList.map(barId => (
              <TransitionNameWrapper
                key={barId}
                barId={barId}
              />
            ))}
          </div>
          <div
            className="grid relative grid-cols-subgrid grid-rows-subgrid row-start-2 border  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black "
            style={{ gridRowEnd: rowsAmount }}
          >
            <LineView
              createStyle={lastLineStyleFn}
              textOverlay
              textPosition="left"
            />
            {lines.map(line => (
              <Line
                key={line.idx}
                idx={line.idx}
              />
            ))}
            {displayingBarsIdList.map(barId => (
              <RefContextProvider key={barId}>
                <Bar
                  barId={barId}
                  hover={hover}
                  seeingElement={seeingElement}
                />
              </RefContextProvider>
            ))}
            {ReactDOM.createPortal(
              <WaterfallTooltip
                tooltipRef={tooltipRef}
                seeingElement={seeingElement}
              />,
              document.body
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

type ContentProps = {
  tooltipRef: MutableRefObject<HTMLDivElement | null>
  seeingElement: string | null
}

const MOCK: BarType = {
  transitionName: "auth:role",
  startedAt: new Date("2025-04-27T22:33:15.058Z"),
  endedAt: new Date("2025-04-27T22:33:15.760Z"),
  status: "fail",
  id: "auth:role-33m_15s_057ms",
  durationMs: "running",
  label: "Fetch permissions",
  error: new Error("Something went wrong!"),
} as const

export function WaterfallTooltip({
  tooltipRef,
  seeingElement: seeingBar,
}: ContentProps) {
  const { extractErrorMessage: extractErrorMessageFn } =
    useContext(WaterfallContext) ?? {}
  const barInfo = WF.useCommittedSelector(s =>
    seeingBar ? s.getBarsByBarId()[seeingBar] : null
  )
  if (!seeingBar || barInfo === null) return null
  // const barInfo = MOCK

  return (
    <div
      className="absolute z-50 left-0 top-0 pointer-events-none"
      ref={tooltipRef}
    >
      <div className="-translate-x-1/2 -translate-y-full bg-white text-black dark:bg-gray-900 dark:text-white rounded-md border">
        <div className="p-2">
          {barInfo.label != null ? (
            <>
              <h3 className="pl-1 text-lg tracking-wide font-semibold">
                {barInfo.label}
              </h3>
              <div className="py-1.5" />
            </>
          ) : null}
          <div className="flex items-center justify-between gap-1">
            <StatusBadge variant={barInfo.status}>{barInfo.status}</StatusBadge>
            <div className="border px-2 text-sm/none h-5 flex items-center gap-1">
              {getDuration(barInfo) !== "running" && (
                <span className="text-xs">took</span>
              )}
              <strong>{getDuration(barInfo)}</strong>
            </div>
          </div>
          <div className="py-0.5" />
          <div className="flex items-center gap-1">
            <ul className="flex items-center gap-0.5">
              {["[", ...barInfo.transitionName.split(":"), "]"].map(
                subTransition => {
                  return (
                    <span className="bg-gray-100 border-gray-200 dark:bg-gray-600 border dark:border-gray-800 text-gray-600 dark:text-gray-200 px-1">
                      {subTransition}
                    </span>
                  )
                }
              )}
            </ul>
          </div>
        </div>
        {barInfo.error && !isAbortError(barInfo.error) ? (
          <>
            <div className="py-0.5" />
            <div className="border-b border-gray-700 w-full" />
            <div className="py-0.5" />
            <div className="px-2 pb-2">
              <strong className="text-sm/none py-0.5 pb-2 block">
                Reason:
              </strong>
              <div
                className={cn(
                  "p-2 text-xs/none flex items-center gap-1 rounded-md border",
                  `
                dark:bg-red-900/50 
                dark:border-red-800
                dark:text-red-300
                bg-red-100 
                border-red-200/80
                text-red-800/80
                `
                )}
              >
                <span className="max-w-[256px]">
                  {extractErrorMessageFn?.(barInfo.error) ??
                    extractErrorMessage(barInfo.error)}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function getDuration(barInfo: BarType) {
  if (barInfo.endedAt === "running") return "running"
  const startedAt = new Date(barInfo.startedAt)
  const endedAt = new Date(barInfo.endedAt)
  const ms = endedAt.getTime() - startedAt.getTime()
  return getDisplayingValue(ms)
}

type BarProps = {
  barId: string
  hover(barId: string | null): void
  seeingElement: string | null
}

export const Bar = forwardRef(function Bar({
  barId,
  hover,
  seeingElement,
}: BarProps) {
  const [waterfallStore] = WF.useStore()
  const barRef = useContext(RefContext)
  const transitionName = WF.useCommittedSelector(
    s => s.getBarsByBarId()[barId].transitionName
  )
  const isHovering = barId === seeingElement

  useSyncExternalStore(
    cb => waterfallStore.subscribe(cb),
    () => {
      if (!barRef?.current) return
      const state = waterfallStore.getState()
      const config = state.getConfig()
      const bar = state.getBarsByBarId()[barId]
      // const isHighlighting = state.highlightingTransition !== null
      const isHighlighting = false
      const dataHighlight =
        state.highlightingTransition === bar.transitionName
          ? "highlight"
          : "mute"
      const started_diff = bar.startedAt.getTime() - config.min
      const started_pct = started_diff / config.traveled
      const started_pctString = started_pct * 100 + "%"
      const ended_diff =
        typeof bar.endedAt === "string"
          ? "running"
          : bar.endedAt.getTime() - config.min
      let ended_pct =
        typeof ended_diff === "string" ? 1 : ended_diff / config.traveled
      ended_pct = ended_pct > 1 ? 1 : ended_pct
      const ended_pctString = 100 - ended_pct * 100 + "%"

      const style = {
        left: started_pctString,
        right: ended_pctString,
        top: 0,
        bottom: 0,
      }

      const el = barRef.current as Record<string, any>
      for (const prop in style) {
        el.style[prop] = style[prop as keyof typeof style]
      }
      el.setAttribute("data-status", bar.status)
      el.setAttribute("data-highlight", isHighlighting ? dataHighlight : null)
      const textEl = el.querySelector("span") as HTMLSpanElement
      if (bar.label != null) {
        textEl.innerText = bar.label
      }
    }
  )

  return (
    <div className="w-full flex p-0.5 overflow-hidden  border-gray-200 dark:border-gray-800/70">
      <div className="relative w-full h-full">
        <div
          ref={barRef}
          onMouseEnter={e => {
            e.preventDefault()
            e.stopPropagation()
            hover(barId)
            waterfallStore.dispatch({
              type: "hover-transition-name",
              payload: {
                transitionName,
              },
            })
          }}
          onMouseLeave={e => {
            e.preventDefault()
            e.stopPropagation()

            hover(null)
            waterfallStore.dispatch({
              type: "hover-out-transition-name",
              payload: {
                transitionName,
              },
            })
          }}
          className={cn(
            isHovering &&
              `
              ring-2
            data-[status=running]:ring-sky-300
            data-[status=fail]:ring-red-400
            data-[status=success]:ring-green-400
            data-[status=cancelled]:ring-amber-400
            `,
            `
            flex items-center p-1
            rounded-sm
            truncate
            min-w-0
            
            absolute
            hover:cursor-pointer
            data-[status=fail]:bg-red-600
            data-[status=fail]:text-red-100
            data-[status=cancelled]:bg-amber-600
            data-[status=cancelled]:text-amber-300
            data-[status=running]:bg-sky-600
            data-[status=running]:text-sky-200
            data-[status=success]:bg-green-600
            data-[status=success]:text-green-100
            

            data-[highlight=mute]:opacity-30
            `
          )}
        >
          <span />
        </div>
      </div>
    </div>
  )
})

type LineProps = {
  idx: number
}

export function Line({ idx }: LineProps) {
  const lineStyleFn = useMemo(() => createLineStyleFn(idx), [idx])

  return (
    <LineView
      textOverlay={false}
      createStyle={lineStyleFn}
      textPosition="right"
      idx={idx}
    />
  )
}
type LineViewProps = {
  createStyle(state: WaterfallState): React.CSSProperties
  textPosition: "left" | "right"
  textOverlay: boolean
  idx?: number
}

type Handle = {
  waterfallStore: WaterfallStore
  lineViewContentRef: React.RefObject<HTMLSpanElement>
  lineViewRef: React.RefObject<HTMLDivElement>
  createStyle(state: WaterfallState): React.CSSProperties
  idx?: number
}

const handle = ({
  lineViewContentRef,
  waterfallStore,
  lineViewRef,
  createStyle,
  idx,
}: Handle) => {
  const state = waterfallStore.getState()
  const duration = state.getConfig().max - state.getConfig().min

  if (lineViewContentRef.current) {
    if (state.getConfig().max === undefined) return
    const displayingValue = getDisplayingValue(
      idx != null ? idx * state.distance : duration
    )
    // TODO: check if it's necessary to update the text
    if (lineViewContentRef.current.innerText !== displayingValue) {
      lineViewContentRef.current.innerText = displayingValue
    }
  }

  if (lineViewRef.current) {
    const style = createStyle(state)
    for (const prop in style) {
      // if(prop === "left" && style[prop] && style[prop] > 1) {
      // }

      const el = lineViewRef.current as Record<string, any>
      el.style[prop] = style[prop as keyof typeof style]
    }
  }
}

const LineView = memo(function LineView({
  createStyle,
  textPosition,
  textOverlay,
  idx,
}: LineViewProps) {
  const lineViewRef = useRef<HTMLDivElement>(null)
  const lineViewContentRef = useRef<HTMLSpanElement>(null)
  const [waterfallStore] = WF.useStore()
  useSyncExternalStore(
    cb => waterfallStore.subscribe(cb),
    () =>
      handle({
        createStyle,
        lineViewContentRef,
        lineViewRef,
        waterfallStore,
        idx,
      })
  )

  return (
    <div
      ref={lineViewRef}
      className="absolute w-[1px] bottom-0 top-0 bg-gray-100 dark:bg-gray-900"
    >
      <span
        className={cn(
          "absolute bottom-full text-[10px] text-gray-400",
          textPosition === "left" ? "-translate-x-full" : "",
          textOverlay &&
            "bg-gray-100 dark:bg-gray-900 leading-[10px] mb-[5px] z-10 pl-4"
        )}
        ref={lineViewContentRef}
      />
    </div>
  )
})

/**
 * Formats the duration value to a string with appropriate units.
 * - If duration is >= 1000, it's converted to seconds ("s").
 * - If duration is < 1000, it's kept in milliseconds ("ms").
 * - The numeric part is fixed to two decimal places only if it's a float.
 *
 * @param duration - The duration in milliseconds.
 * @returns A formatted string representing the duration.
 *
 * @example
 * getDisplayingValue(1500); // "1.50s"
 * getDisplayingValue(500);  // "500ms"
 * getDisplayingValue(2000); // "2s"
 */
function getDisplayingValue(duration: number): string {
  const pastSeconds = duration >= 1000

  let value = pastSeconds ? duration / 1000 : duration

  let valueStr: string = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2)

  valueStr =
    valueStr.endsWith("0") && valueStr.includes(".")
      ? valueStr.slice(0, -1)
      : valueStr

  let suffix = pastSeconds ? "s" : "ms"

  return valueStr + suffix
}

type SorterHeaderProps = {
  children?: React.ReactNode
  property: keyof BarSorters
}

export function SorterHeader({ children, property }: SorterHeaderProps) {
  const [waterfallStore] = WF.useStore()

  const currentSorter = WF.useCommittedSelector(
    s => s.getCurrentSorters()[property]
  )

  return (
    <div
      role="button"
      onClick={() => {
        waterfallStore.dispatch({
          type: "toggle-sorter",
          payload: {
            field: property,
          },
        })
      }}
      className="flex justify-center relative mb-4 p-1  border text-center  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black font-semibold select-none"
    >
      <div className="min-w-[0px] shrink-[999] max-w-[30px] w-full" />
      <span className="shrink-0">{children}</span>
      <div className="min-w-[30px] shrink-0 max-w-[30px] w-full" />
      <ChevronCornerWrapper>
        <ChevronSort state={currentSorter.name} />
      </ChevronCornerWrapper>
    </div>
  )
}

type ChevronSortProps = {
  state: string
}

export function ChevronSort({ state }: ChevronSortProps) {
  return (
    <ChevronUp
      size={18}
      data-state={state}
      className="data-[state='ascending']:rotate-180 data-[state='descending']:rotate-0 data-[state='default']:opacity-0 transition-all duration-200 ease-[cubic-bezier(0, 1, 0.5, 1)]"
    />
  )
}

export type ChevronCornerWrapperProps = React.ComponentPropsWithoutRef<"div">

export const ChevronCornerWrapper = React.forwardRef<
  React.ElementRef<"div">,
  ChevronCornerWrapperProps
>(function ChevronCornerWrapperComponent({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("absolute right-2 top-1/2 -translate-y-1/2", className)}
      {...props}
    />
  )
})

type TransitionNameProps = {
  barId: string
}

export function TransitionName({ barId }: TransitionNameProps) {
  const transitionName = WF.useCommittedSelector(
    s => s.getDisplayingBars().find(bar => bar.id === barId)?.transitionName
  )
  return transitionName
}

const createLineStyleFn = (idx: number) => (state: WaterfallState) => {
  const duration = state.distance * idx
  const left = duration / state.getConfig().traveled

  return { left: left * 100 + "%", width: duration === 0 ? 0 : 1 }
}

const lastLineStyleFn = () => {
  return {
    right: 0,
    width: 0,
  }
}

type TransitionNameWrapperProps = {
  barId: string
}

export function TransitionNameWrapper({ barId }: TransitionNameWrapperProps) {
  const [waterfallStore] = WF.useStore()
  const transitionName = WF.useCommittedSelector(
    s => s.getBarsByBarId()[barId].transitionName
  )

  return (
    <span
      onMouseEnter={() => {
        waterfallStore.dispatch({
          type: "hover-transition-name",
          payload: {
            transitionName,
          },
        })
      }}
      onMouseLeave={() => {
        waterfallStore.dispatch({
          type: "hover-out-transition-name",
          payload: {
            transitionName,
          },
        })
      }}
      className="hover:cursor-pointer px-3 text-gray-400 p-1 text-sm  border  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black"
    >
      <TransitionName barId={barId} />
    </span>
  )
}

import { useMouse } from "~/hooks/use-mouse"
import { MutableRefObject } from "react"
import { BarType } from "./types"
import { error } from "console"
import { extractErrorMessage } from "~/lib/extract-error-message"
import { useNewStore } from "saphyra/react"

export const RefContext =
  createContext<MutableRefObject<HTMLDivElement | null> | null>(null)

type RefContextProviderProps = {
  children: React.ReactNode
}

export function RefContextProvider({ children }: RefContextProviderProps) {
  const ref = useRef<HTMLDivElement>(null)
  return <RefContext.Provider value={ref}>{children}</RefContext.Provider>
}

export const statusBadgeVariants = cva("", {
  variants: {
    variant: {
      success: "bg-green-600 text-green-200 border-green-500",
      fail: cn(
        "dark:bg-red-800 dark:text-red-200 dark:border-red-500",
        "bg-red-100 text-red-800 border-red-200/80"
      ),
      cancelled: "bg-amber-600 text-amber-200 border-amber-500",
      running: "bg-sky-600 text-sky-200 border-sky-500",
    },
  },
})

type StatusBadgeProps = {
  children: React.ReactNode
  className?: string
} & VariantProps<typeof statusBadgeVariants>

export function StatusBadge({
  children,
  variant,
  className,
}: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "border px-2 rounded-md text-sm/none h-5 flex items-center gap-1",
        statusBadgeVariants({ variant }),
        className
      )}
    >
      {children}
    </div>
  )
}

function isAbortError(error: unknown) {
  if (typeof error !== "object") return false
  if (error == null) return false
  if ("code" in error && error.code === 20) return true
  return false
}
