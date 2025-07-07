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
  MutableRefObject,
} from "react"
import { newWaterfallStore, WaterfallState, WaterfallStore, WF } from "./store"
import { cn } from "./utils"
import { SomeStoreGeneric } from "../../../src/types"
import { BarSorters } from "./sorters"
import { ChevronUpIcon } from "./icons"
import React from "react"
import ReactDOM from "react-dom"
import { useMouse } from "./hooks"
import { BarType } from "./types"
import "./waterfall.css"

const WaterfallContext = createContext<{
  extractErrorMessage?: (error: unknown) => string
} | null>(null)

type ButtonPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right"

type WaterfallDevtoolsProps = {
  store: SomeStoreGeneric
  extractErrorMessage?: (error: unknown) => string
  buttonPosition?: ButtonPosition
}

// Main exported component with portal toggle
export function WaterfallDevtools({
  store,
  extractErrorMessage,
  buttonPosition = "bottom-right",
}: WaterfallDevtoolsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  )

  const getButtonPositionStyles = (position: ButtonPosition) => {
    const baseStyles = {
      position: "fixed" as const,
      zIndex: 1000000,
      pointerEvents: "auto" as const,
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      fontWeight: "500",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }

    switch (position) {
      case "top-left":
        return { ...baseStyles, top: "20px", left: "20px" }
      case "top-right":
        return { ...baseStyles, top: "20px", right: "20px" }
      case "bottom-left":
        return { ...baseStyles, bottom: "20px", left: "20px" }
      case "bottom-right":
        return { ...baseStyles, bottom: "20px", right: "20px" }
      default:
        return { ...baseStyles, bottom: "20px", right: "20px" }
    }
  }

  const getPanelPositionStyles = (position: ButtonPosition) => {
    const baseStyles = {
      position: "fixed" as const,
      width: "800px",
      height: "600px",
      backgroundColor: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      pointerEvents: "auto" as const,
      zIndex: 1000000,
      overflow: "hidden" as const,
    }

    switch (position) {
      case "top-left":
        return { ...baseStyles, top: "60px", left: "20px" }
      case "top-right":
        return { ...baseStyles, top: "60px", right: "20px" }
      case "bottom-left":
        return { ...baseStyles, bottom: "60px", left: "20px" }
      case "bottom-right":
        return { ...baseStyles, bottom: "60px", right: "20px" }
      default:
        return { ...baseStyles, bottom: "60px", right: "20px" }
    }
  }

  useEffect(() => {
    // Create portal container if it doesn't exist
    let container = document.getElementById("saphyra-waterfall-portal")
    if (!container) {
      container = document.createElement("div")
      container.id = "saphyra-waterfall-portal"
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000000;
      `
      document.body.appendChild(container)
    }
    setPortalContainer(container)

    return () => {
      // Clean up when component unmounts
      const existingContainer = document.getElementById(
        "saphyra-waterfall-portal"
      )
      if (existingContainer && existingContainer.children.length === 0) {
        existingContainer.remove()
      }
    }
  }, [])

  if (!portalContainer) return null

  return ReactDOM.createPortal(
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={getButtonPositionStyles(buttonPosition)}
      >
        {isVisible ? "Hide" : "Show"} Waterfall
      </button>

      {/* Waterfall Panel */}
      {isVisible && (
        <div style={getPanelPositionStyles(buttonPosition)}>
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 1000001,
            }}
          >
            <button
              onClick={() => setIsVisible(false)}
              style={{
                padding: "4px 8px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: "8px", height: "100%" }}>
            <Waterfall
              store={store}
              extractErrorMessage={extractErrorMessage}
            />
          </div>
        </div>
      )}
    </>,
    portalContainer
  )
}

type WaterfallProps = {
  store: SomeStoreGeneric
  extractErrorMessage?: (error: unknown) => string
}

export function Waterfall({ store, extractErrorMessage }: WaterfallProps) {
  const waterfallState = useState(() =>
    newWaterfallStore({
      bars: [],
      distance: 500,
      clearTimeout: 1000,
    })
  )
  const [waterfallStore] = waterfallState

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
      <WF.Context.Provider value={waterfallState}>
        <div className="grid grid-rows-[auto_1fr] gap-1 h-full">
          <WaterfallController />
          <WaterfallContent />
        </div>
      </WF.Context.Provider>
    </WaterfallContext.Provider>
  )
}

export function WaterfallController() {
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
            // @ts-expect-error - TODO: fix this
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
            // @ts-expect-error - TODO: fix this
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

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none"
      ref={tooltipRef}
      style={{ zIndex: 1000002 }}
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
                (subTransition, idx) => {
                  return (
                    <span
                      key={idx}
                      className="bg-gray-100 border-gray-200 dark:bg-gray-600 border dark:border-gray-800 text-gray-600 dark:text-gray-200 px-1"
                    >
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
                    String(barInfo.error)}
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
      const isHighlighting = state.highlightingTransition !== null
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
    <div className="w-full flex p-0.5 overflow-hidden border-gray-200 dark:border-gray-800/70">
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
  return (
    <LineView
      createStyle={createLineStyleFn(idx)}
      textPosition="right"
      textOverlay={false}
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
  return () => {
    const state = waterfallStore.state
    const style = createStyle(state)
    if (!lineViewRef.current) return
    Object.assign(lineViewRef.current.style, style)

    if (!lineViewContentRef.current) return
    const distance = state.distance
    const config = state.getConfig()
    const timeValue = config.min + (idx ?? 0) * distance
    const passed = timeValue - config.min
    lineViewContentRef.current.textContent = getDisplayingValue(passed)
  }
}

const LineView = memo(function LineView({
  createStyle,
  textPosition,
  textOverlay,
  idx,
}: LineViewProps) {
  const [waterfallStore] = WF.useStore()
  const lineViewRef = useRef<HTMLDivElement>(null)
  const lineViewContentRef = useRef<HTMLSpanElement>(null)

  useSyncExternalStore(
    cb => waterfallStore.subscribe(cb),
    handle({
      waterfallStore,
      lineViewContentRef,
      lineViewRef,
      createStyle,
      idx,
    })
  )

  return (
    <div
      className="row-span-full absolute left-0 top-0 bg-gray-100 dark:bg-gray-800 opacity-70"
      style={{
        width: "1px",
        height: "100%",
      }}
      ref={lineViewRef}
    >
      {textOverlay && (
        <span
          className={cn(
            "absolute bg-white dark:bg-gray-900 border dark:border-gray-700 p-0.5 text-xs/none min-w-4 text-center z-20 pointer-events-none",
            textPosition === "left" && "left-1",
            textPosition === "right" && "right-1"
          )}
          style={{ top: "-12px" }}
          ref={lineViewContentRef}
        />
      )}
    </div>
  )
})

function getDisplayingValue(duration: number): string {
  if (duration < 1000) {
    return `${Math.round(duration)}ms`
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

type SorterHeaderProps = {
  children?: React.ReactNode
  property: keyof BarSorters
}

export function SorterHeader({ children, property }: SorterHeaderProps) {
  const currentSorters = WF.useCommittedSelector(s => s.getCurrentSorters())
  const [waterfallStore] = WF.useStore()

  const currentSorter = currentSorters[property]

  return (
    <div
      className="p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex gap-1 items-center text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
      onClick={() => {
        waterfallStore.dispatch({
          type: "toggle-sorter",
          payload: { field: property },
        })
      }}
    >
      <span>{children}</span>
      <ChevronSort state={currentSorter?.name || "default"} />
    </div>
  )
}

type ChevronSortProps = {
  state: string
}

export function ChevronSort({ state }: ChevronSortProps) {
  const rotation = useMemo(() => {
    if (state === "ascending") return "0deg"
    if (state === "descending") return "180deg"
    return "90deg"
  }, [state])

  return (
    <div
      className="transition-transform"
      style={{ transform: `rotate(${rotation})` }}
    >
      <ChevronUpIcon size={12} />
    </div>
  )
}

type TransitionNameProps = {
  barId: string
}

export function TransitionName({ barId }: TransitionNameProps) {
  const barsByBarId = WF.useCommittedSelector(s => s.getBarsByBarId())
  const barInfo = barsByBarId[barId]

  if (!barInfo) return null

  return (
    <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
      {barInfo.transitionName}
    </div>
  )
}

const createLineStyleFn = (idx: number) => (state: WaterfallState) => {
  const config = state.getConfig()
  const distance = state.distance
  const timeValue = config.min + idx * distance
  const pct = (timeValue - config.min) / config.traveled
  return {
    left: pct * 100 + "%",
  }
}

const lastLineStyleFn = () => {
  return {
    left: "100%",
  }
}

type TransitionNameWrapperProps = {
  barId: string
}

export function TransitionNameWrapper({ barId }: TransitionNameWrapperProps) {
  const barsByBarId = WF.useCommittedSelector(s => s.getBarsByBarId())
  const barInfo = barsByBarId[barId]
  const [waterfallStore] = WF.useStore()

  if (!barInfo) return null

  return (
    <div
      className="row-span-1 p-1 text-xs border border-gray-200 dark:border-gray-700 flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
      onMouseEnter={() => {
        waterfallStore.dispatch({
          type: "hover-transition-name",
          payload: { transitionName: barInfo.transitionName },
        })
      }}
      onMouseLeave={() => {
        waterfallStore.dispatch({
          type: "hover-out-transition-name",
          payload: { transitionName: barInfo.transitionName },
        })
      }}
    >
      <TransitionName barId={barId} />
    </div>
  )
}

type RefContextProviderProps = {
  children: React.ReactNode
}

const RefContext = createContext<React.RefObject<HTMLDivElement> | null>(null)

export function RefContextProvider({ children }: RefContextProviderProps) {
  const ref = useRef<HTMLDivElement>(null)

  return <RefContext.Provider value={ref}>{children}</RefContext.Provider>
}

type StatusBadgeProps = {
  children: React.ReactNode
  variant?: "success" | "fail" | "cancelled" | "running"
}

export function StatusBadge({
  children,
  variant = "success",
}: StatusBadgeProps) {
  const variantClasses = useMemo(() => {
    switch (variant) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700"
      case "fail":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600"
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600"
    }
  }, [variant])

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-full text-xs font-medium border",
        variantClasses
      )}
    >
      {children}
    </span>
  )
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}
