import { useEffect, useReducer, useState } from "react"
import { newWaterfallStore, WF } from "./store"
import { BarType } from "./types"
import { cn } from "~/lib/cn"
import { SomeStoreGeneric } from "~/create-store"
import { BarFilters } from "./filters"
import { ChevronDown, ChevronUp } from "lucide-react"
import React from "react"

type WaterfallProps = {
  store: SomeStoreGeneric
}

export function Waterfall({ store }: WaterfallProps) {
  const waterfallState = useState(() =>
    newWaterfallStore({
      bars: [],
      distance: 500,
      clearTimeout: 1000,
    })
  )
  const [waterfallStore] = waterfallState
  const state = WF.useStore(undefined, waterfallStore)

  useEffect(() =>
    store.internal.events.on("new-transition", ({ transitionName, id }) => {
      waterfallStore.dispatch({
        type: "add-bar",
        payload: { transitionName, id },
      })
    })
  )

  useEffect(() =>
    store.internal.events.on("transition-completed", ({ id, status }) => {
      waterfallStore.dispatch({
        type: "end-bar",
        payload: { id, status },
      })
    })
  )

  // useEffect(() =>
  //   store.internal.events.on("transition-completed", ({ id, status }) => {
  //     waterfallStore.dispatch({
  //       type: "reset",
  //       payload: { id, status },
  //     })
  //   })
  // )

  return (
    <WF.Provider value={waterfallState}>
      <div className="grid grid-rows-[auto_1fr] gap-1 h-full">
        <WaterfallController />
        <WaterfallContent />
      </div>
    </WF.Provider>
  )
}

type WaterfallControllerProps = {}

export function WaterfallController({}: WaterfallControllerProps) {
  const distance = WF.useStore(s => s.distance)
  const [localDistance, setLocalDistance] = useReducer(
    (distance: number, newDistance: number) => {
      if (isNaN(newDistance)) return distance
      if (newDistance > 5_000) return distance
      if (newDistance < 0) return distance
      return newDistance
    },
    distance
  )

  const clearTimeout = WF.useStore(s => s.clearTimeout)
  const [localClearTimeout, setLocalClearTimeout] = useReducer(
    (clearTimeout: number, newClearTimeout: number) => {
      if (isNaN(newClearTimeout)) return clearTimeout
      if (newClearTimeout > 5_000) return clearTimeout
      if (newClearTimeout < 0) return clearTimeout
      return newClearTimeout
    },
    clearTimeout
  )

  const [waterfallStore] = WF.useUseState()

  return (
    <div className="flex justify-between">
      <span />

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
  const [waterfallStore] = WF.useUseState()
  const bars = WF.useStore(s => s.bars)
  const displayingBars = WF.useStore(s => s.$displayingBars)
  const config = WF.useStore(s => s.$config)
  const distance = WF.useStore(s => s.distance)

  useEffect(() => {
    Object.assign(window, { waterfallStore })
  }, [])

  const linesAmount = Math.ceil((config.max - config.min) / distance)
  const lines = Array.from({ length: linesAmount }).map((_, idx) => ({
    idx,
    distance,
  }))

  const COLUMNS = ["transition name", "timing"]

  const newColumns = displayingBars.reduce((acc, bar) => {
    COLUMNS.forEach((columnName, idx) => {
      acc[idx] ??= { columnName, rows: [] }
      acc[idx].rows.push(bar)
    })

    return acc
  }, [] as any[])

  const updateConfig = (bars: BarType[]) => {
    waterfallStore.dispatch({
      type: "refresh",
    })

    if (waterfallStore.state.$isSomeRunning) {
      waterfallStore.uncontrolledState.animationFrame = requestAnimationFrame(
        () => updateConfig(bars)
      )
    }
  }

  const rowsAmount = newColumns[0] != null ? newColumns[0].rows.length + 2 : 0

  useEffect(() => {
    if (rowsAmount === 0) return
    waterfallStore.uncontrolledState.animationFrame = requestAnimationFrame(
      () => updateConfig(bars)
    )

    return () => {
      const { animationFrame } = waterfallStore.uncontrolledState
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [updateConfig, rowsAmount, bars])

  return (
    <div className="border border-gray-200 dark:border-gray-800/70 p-0.5 bg-gray-100 dark:bg-gray-900 overflow-y-auto overflow-x-hidden">
      <div className="grid grid-cols-[auto_1fr] gap-0.5">
        <div className="grid grid-cols-subgrid col-span-2 row-span-1 gap-0.5">
          <FilterHeader property="transitionName">name</FilterHeader>
          <FilterHeader property="startedAt">timing</FilterHeader>
        </div>
        <div className="contents">
          {newColumns.map(column => {
            if (column.columnName === "timing") {
              return (
                <div
                  key={column.columnName}
                  className="grid relative grid-cols-subgrid grid-rows-subgrid row-start-2 border  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black "
                  style={{ gridRowEnd: rowsAmount }}
                >
                  <LineView
                    hidden={false}
                    duration={config.max - config.min}
                    style={{
                      right: 0,
                      width: 0,
                    }}
                    textOverlay
                    textPosition="left"
                  />
                  {lines.map((line, idx) => (
                    <Line
                      key={line.idx}
                      line={line}
                      config={config}
                      idx={idx}
                    />
                  ))}
                  {displayingBars.map((bar, idx) => (
                    <div
                      key={bar.id}
                      className="w-full flex p-0.5 overflow-hidden  border-gray-200 dark:border-gray-800/70"
                    >
                      <Bar
                        key={idx}
                        bar={bar}
                        config={config}
                      />
                    </div>
                  ))}
                </div>
              )
            }
            return (
              <div
                key={column.columnName}
                className="grid grid-cols-subgrid grid-rows-subgrid row-start-2 "
                style={{ gridRowEnd: rowsAmount }}
              >
                {column.rows.map((row: any) => (
                  <span
                    key={row.id}
                    className="px-3 text-gray-400 p-1 text-sm  border  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black"
                  >
                    {row.transitionName}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type BarProps = {
  bar: BarType
  config: Record<string, number>
}

export function Bar({ bar, config }: BarProps) {
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

  return (
    <div className="relative w-full h-full">
      <div
        ref={node => {
          node?.style
        }}
        className={cn("absolute ", {
          "bg-sky-500": bar.status === "running",
          "bg-red-500": bar.status === "fail",
          "bg-green-500": bar.status === "success",
          "bg-amber-500": bar.status === "cancelled",
        })}
        style={style}
      />
    </div>
  )
}

type LineType = {
  idx: number
  distance: number
}

type LineProps = {
  line: LineType
  config: Record<string, number>
  idx: number
}

export function Line({ config, line, idx }: LineProps) {
  const duration = line.distance * idx
  const left = duration / config.traveled

  return (
    <LineView
      textOverlay={false}
      duration={duration}
      hidden={left > 1}
      style={{ left: left * 100 + "%", width: duration === 0 ? 0 : 1 }}
      textPosition="right"
    />
  )
}
type LineViewProps = {
  duration: number
  hidden: boolean
  style: React.CSSProperties
  textPosition: "left" | "right"
  textOverlay: boolean
}

export function LineView({
  duration,
  hidden,
  style,
  textPosition,
  textOverlay,
}: LineViewProps) {
  if (hidden) return null

  const displayingValue = getDisplayingValue(duration)

  return (
    <div
      className="absolute w-[1px] bottom-0 top-0 bg-gray-100 dark:bg-gray-900"
      style={{
        ...style,
      }}
    >
      <span
        className={cn(
          "absolute bottom-full text-[10px] text-gray-400",
          textPosition === "left" ? "-translate-x-full" : "",
          textOverlay &&
            "bg-gray-100 dark:bg-gray-900 leading-[10px] mb-[5px] z-10"
        )}
      >
        {displayingValue}
      </span>
    </div>
  )
}

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

type FilterHeaderProps = {
  children?: React.ReactNode
  property: keyof BarFilters
}

export function FilterHeader({ children, property }: FilterHeaderProps) {
  const [waterfallStore] = WF.useUseState()

  const currentFilter = WF.useStore(s => s.$currentFilters[property])

  return (
    <div
      role="button"
      onClick={() => {
        waterfallStore.dispatch({
          type: "toggle-filter",
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
        <ChevronSort state={currentFilter.name} />
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
