import { useEffect, useState } from "react"
import { newWaterfallStore, WF } from "./store"
import { CircleStop } from "lucide-react"
import { BarType } from "./types"
import { cn } from "~/lib/cn"
import { SomeStoreGeneric } from "~/create-store"

const DISTANCE = 1000

type WaterfallProps = {
  store: SomeStoreGeneric
}

export function Waterfall({ store }: WaterfallProps) {
  const waterfallState = useState(() =>
    newWaterfallStore({
      bars: [],
    })
  )
  const [waterfallStore] = waterfallState

  useEffect(() =>
    store.events.on("new-transition", ({ transitionName, id }) => {
      waterfallStore.dispatch({
        type: "add-bar",
        payload: { transitionName, id },
      })
    })
  )

  useEffect(() =>
    store.events.on("transition-completed", ({ id, status }) => {
      waterfallStore.dispatch({
        type: "end-bar",
        payload: { id, status },
      })
    })
  )

  // useEffect(() =>
  //   store.events.on("transition-completed", ({ id, status }) => {
  //     waterfallStore.dispatch({
  //       type: "reset",
  //       payload: { id, status },
  //     })
  //   })
  // )

  return (
    <WF.Provider value={waterfallState}>
      <div className="grid grid-rows-[auto_1fr] gap-0.5">
        <WaterfallController />
        <WaterfallContent />
      </div>
    </WF.Provider>
  )
}

type WaterfallControllerProps = {}

export function WaterfallController({}: WaterfallControllerProps) {
  const [waterfallStore] = WF.useUseState()

  return (
    <div className="flex justify-between">
      <span />
      <div className="rounded-md border bg-neutral-100 border-neutral-200 p-0.5">
        <div
          role="button"
          className="h-6 grid place-items-center aspect-square rounded-sm hover:cursor-pointer hover:bg-neutral-200 transition-all"
          onClick={() => {
            waterfallStore.dispatch({
              type: "reset",
            })
          }}
        >
          <CircleStop
            size={16}
            className={"text-neutral-500"}
          />
        </div>
      </div>
    </div>
  )
}

function WaterfallContent() {
  const [waterfallStore] = WF.useUseState()
  const bars = WF.useStore(s => s.bars)
  const config = WF.useStore(s => s.$config)

  const linesAmount = Math.ceil((config.max - config.min) / DISTANCE)
  const lines = Array.from({ length: linesAmount }).map((_, idx) => ({
    idx,
    distance: DISTANCE,
  }))

  const COLUMNS = ["transition name", "timing"]

  const newColumns = bars.reduce((acc, bar) => {
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
    <div className="border border-neutral-200 p-0.5 bg-neutral-100 rounded-[0.5rem] overflow-hidden">
      <div className="grid grid-cols-[auto_1fr] gap-0.5">
        <div className="grid grid-cols-subgrid col-span-2 row-span-1 gap-0.5">
          <span className="mb-4 p-1 rounded-md border text-center border-neutral-200 bg-white font-semibold">
            nome
          </span>
          <span className="mb-4 p-1 rounded-md border text-center border-neutral-200 bg-white font-semibold">
            timing
          </span>
        </div>
        {newColumns.map(column => {
          if (column.columnName === "timing") {
            return (
              <div
                key={column.columnName}
                className="grid relative grid-cols-subgrid grid-rows-subgrid row-start-2 border border-neutral-200 bg-white rounded-md"
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
                {bars.map((bar, idx) => (
                  <div
                    key={bar.id}
                    className="w-full flex p-0.5 overflow-hidden border-neutral-200"
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
                  className="px-3 text-neutral-600 p-1 text-sm rounded-md border border-neutral-200 bg-white"
                >
                  {row.transitionName}
                </span>
              ))}
            </div>
          )
        })}
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
        className={cn("absolute rounded-sm", {
          "bg-sky-500": bar.status === "running",
          "bg-red-500": bar.status === "fail",
          "bg-green-500": bar.status === "success",
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
      className="absolute w-[1px] bottom-0 top-0 bg-neutral-100"
      style={{
        ...style,
      }}
    >
      <span
        className={cn(
          "absolute bottom-full text-[10px] text-neutral-400",
          textPosition === "left" ? "-translate-x-full" : "",
          textOverlay && "bg-neutral-100 leading-[10px] mb-[2.5px] z-10"
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
  // Determine if the duration should be displayed in seconds
  const pastSeconds = duration >= 1000

  // Convert duration to seconds or keep in milliseconds
  let value = pastSeconds ? duration / 1000 : duration

  // Format the value:
  // - If integer, no decimal places
  // - If float, fix to two decimal places
  let valueStr: string = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2)

  valueStr =
    valueStr.endsWith("0") && valueStr.includes(".")
      ? valueStr.slice(0, -1)
      : valueStr

  // Choose the appropriate suffix
  let suffix = pastSeconds ? "s" : "ms"

  // Combine the numeric value with its suffix
  return valueStr + suffix
}

function getNumberInRange(min: number, max: number): number {
  if (min >= max) {
    throw new Error("min must be less than max")
  }
  return Math.random() * (max - min) + min
}
