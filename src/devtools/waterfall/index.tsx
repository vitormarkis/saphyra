import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { newWaterfallStore, WaterfallState, WaterfallStore, WF } from "./store"
import { cn } from "~/lib/cn"
import { SomeStoreGeneric } from "~/create-store"
import { BarSorters } from "./sorters"
import { ChevronUp } from "lucide-react"
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
  const [query, setQuery] = useState("")
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
    <div className="flex justify-between gap-2">
      <div className="flex gap-2 flex-1 pl-1">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
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
  const [waterfallStore] = WF.useUseState()
  const displayingBarsIdList = WF.useStore(s => s.$displayingBarsIdList)

  useEffect(() => {
    Object.assign(window, { waterfallStore })
  }, [])

  const updateConfig = useCallback(() => {
    console.log("refreshing")
    waterfallStore.dispatch({
      type: "refresh",
    })

    if (waterfallStore.state.$isSomeRunning) {
      waterfallStore.uncontrolledState.animationFrame =
        requestAnimationFrame(updateConfig)
    }
  }, [waterfallStore])

  const lines = WF.useStore(s => s.$lines)

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
              <span
                key={barId}
                className="px-3 text-gray-400 p-1 text-sm  border  border-gray-200 dark:border-gray-800/70 bg-white dark:bg-black"
              >
                <TransitionName barId={barId} />
              </span>
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
              <Bar
                key={barId}
                barId={barId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type BarProps = {
  barId: string
}

export const Bar = memo(function Bar({ barId }: BarProps) {
  const [waterfallStore] = WF.useUseState()
  const barRef = useRef<HTMLDivElement>(null)
  useSyncExternalStore(
    cb => waterfallStore.subscribe(cb),
    () => {
      if (!barRef.current) return
      const state = waterfallStore.getState()
      const config = state.$config
      const bar = state.$barsByBarId[barId]
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
    }
  )

  return (
    <div className="w-full flex p-0.5 overflow-hidden  border-gray-200 dark:border-gray-800/70">
      <div className="relative w-full h-full">
        <div
          ref={barRef}
          className="absolute data-[status=running]:bg-sky-500 data-[status=fail]:bg-red-500 data-[status=success]:bg-green-500 data-[status=cancelled]:bg-amber-500"
        />
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
  const duration = state.$config.max - state.$config.min

  if (lineViewContentRef.current) {
    if (state.$config.max === undefined) return
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
  const [waterfallStore] = WF.useUseState()
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
  const [waterfallStore] = WF.useUseState()

  const currentSorter = WF.useStore(s => s.$currentSorters[property])

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
  const transitionName = WF.useStore(
    s => s.$displayingBars.find(bar => bar.id === barId)?.transitionName
  )
  return transitionName
}

const createLineStyleFn = (idx: number) => (state: WaterfallState) => {
  const duration = state.distance * idx
  const left = duration / state.$config.traveled

  return { left: left * 100 + "%", width: duration === 0 ? 0 : 1 }
}

const lastLineStyleFn = () => {
  return {
    right: 0,
    width: 0,
  }
}
