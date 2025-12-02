"use client"

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
import { cn, extractErrorMessage } from "./utils"
import type { SomeStoreGeneric } from "saphyra"
import type { BarSorters } from "./sorters"
import React from "react"
import ReactDOM from "react-dom"
import { useMouse } from "./use-mouse"
import type { MutableRefObject } from "react"
import type { BarType } from "./types"
import { useNewStore } from "../../hooks"
import { styles, injectStyles } from "./styles"

const WaterfallContext = createContext<{
  extractErrorMessage?: (error: unknown) => string
} | null>(null)

export type WaterfallProps = {
  store: SomeStoreGeneric
  extractErrorMessage?: (error: unknown) => string
}

export function Waterfall({ store, extractErrorMessage }: WaterfallProps) {
  injectStyles()

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
        <div className={styles.container}>
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
    <div className={styles.controllerWrapper}>
      <div className={styles.searchWrapper}>
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
          className={styles.input}
          placeholder="Transition name"
        />
      </div>

      <div className={styles.controlsWrapper}>
        <input
          type="text"
          value={localClearTimeout}
          onChange={e => {
            setLocalClearTimeout(Number(e.target.value))
          }}
          className={styles.inputTabular}
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
          className={styles.inputTabular}
          onKeyDown={e => {
            if (e.key === "Enter") {
              waterfallStore.setState({
                distance: localDistance,
              })
            }
          }}
        />

        <button
          className={styles.button}
          onClick={() => {
            waterfallStore.dispatch({
              type: "reset",
            })
          }}
        >
          Clear
        </button>
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
    if (waterfallStore.state.stop) return
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
    <div className={styles.contentWrapper}>
      <div className={styles.grid}>
        <div className={styles.gridRow}>
          <SorterHeader property="transitionName">name</SorterHeader>
          <SorterHeader property="startedAt">timing</SorterHeader>
        </div>
        <div className={styles.gridContents}>
          <div
            className={styles.namesColumn}
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
            className={styles.barsColumn}
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
      className={styles.tooltipPortal}
      ref={tooltipRef}
    >
      <div className={styles.tooltip}>
        <div className={styles.tooltipContent}>
          {barInfo.label != null ? (
            <>
              <h3 className={styles.tooltipLabel}>{barInfo.label}</h3>
              <div className={styles.tooltipSpacer} />
            </>
          ) : null}
          <div className={styles.tooltipStatusRow}>
            <StatusBadge variant={barInfo.status}>{barInfo.status}</StatusBadge>
            <div className={styles.durationBadge}>
              {getDuration(barInfo) !== "running" && (
                <span className={styles.durationLabel}>took</span>
              )}
              <strong className={styles.durationValue}>
                {getDuration(barInfo)}
              </strong>
            </div>
          </div>
          <div className={styles.tooltipSmallSpacer} />
          <div className={styles.tooltipTransitionRow}>
            <ul className={styles.tooltipTransitionList}>
              {["[", ...barInfo.transitionName.split(":"), "]"].map(
                subTransition => {
                  return (
                    <span
                      key={`${barInfo.transitionName}-${subTransition}`}
                      className={styles.tooltipTransitionPart}
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
            <div className={styles.tooltipSmallSpacer} />
            <div className={styles.tooltipDivider} />
            <div className={styles.tooltipSmallSpacer} />
            <div className={styles.tooltipErrorSection}>
              <strong className={styles.tooltipErrorLabel}>Reason:</strong>
              <div className={styles.tooltipError}>
                <span>
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
      if (state.stop) return
      const config = state.getConfig()
      const bar = state.getBarsByBarId()[barId]
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

  const status = WF.useCommittedSelector(s => s.getBarsByBarId()[barId].status)
  // const isMuted = WF.useCommittedSelector(s => {
  //   if (s.highlightingTransition === null) return false
  //   const bar = s.getBarsByBarId()[barId]
  //   return s.highlightingTransition !== bar.transitionName
  // })

  const barClassName = cn(
    styles.bar,
    status === "running" && styles.barRunning,
    status === "success" && styles.barSuccess,
    status === "fail" && styles.barFail,
    status === "cancelled" && styles.barCancelled,
    isHovering && status === "running" && styles.barHoveringRunning,
    isHovering && status === "success" && styles.barHoveringSuccess,
    isHovering && status === "fail" && styles.barHoveringFail,
    isHovering && status === "cancelled" && styles.barHoveringCancelled
    // isMuted && styles.barMuted
  )

  return (
    <div className={styles.barWrapper}>
      <div className={styles.barContainer}>
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
          className={barClassName}
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
  if (state.stop) return
  const duration = state.getConfig().max - state.getConfig().min

  if (lineViewContentRef.current) {
    if (state.getConfig().max === undefined) return
    const displayingValue = getDisplayingValue(
      idx != null ? idx * state.distance : duration
    )
    if (lineViewContentRef.current.innerText !== displayingValue) {
      lineViewContentRef.current.innerText = displayingValue
    }
  }

  if (lineViewRef.current) {
    const style = createStyle(state)
    for (const prop in style) {
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

  const textClassName = cn(
    styles.lineText,
    textPosition === "left" && styles.lineTextLeft,
    textOverlay && styles.lineTextOverlay
  )

  return (
    <div
      ref={lineViewRef}
      className={styles.line}
    >
      <span
        className={textClassName}
        ref={lineViewContentRef}
      />
    </div>
  )
})

function getDisplayingValue(duration: number): string {
  const pastSeconds = duration >= 1000

  const value = pastSeconds ? duration / 1000 : duration

  let valueStr: string = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2)

  valueStr =
    valueStr.endsWith("0") && valueStr.includes(".")
      ? valueStr.slice(0, -1)
      : valueStr

  const suffix = pastSeconds ? "s" : "ms"

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
      className={styles.sorterHeader}
    >
      <div className={styles.sorterSpacer} />
      <span className={styles.sorterLabel}>{children}</span>
      <div className={styles.sorterIconWrapper} />
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
  const className = cn(
    styles.chevronIcon,
    state === "ascending" && styles.chevronAscending,
    state === "descending" && styles.chevronDescending,
    state === "default" && styles.chevronDefault
  )

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
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
      className={cn(styles.chevronWrapper, className)}
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
      className={styles.transitionName}
    >
      <TransitionName barId={barId} />
    </span>
  )
}

export const RefContext =
  createContext<MutableRefObject<HTMLDivElement | null> | null>(null)

type RefContextProviderProps = {
  children: React.ReactNode
}

export function RefContextProvider({ children }: RefContextProviderProps) {
  const ref = useRef<HTMLDivElement>(null)
  return <RefContext.Provider value={ref}>{children}</RefContext.Provider>
}

type StatusBadgeProps = {
  children: React.ReactNode
  className?: string
  variant: "success" | "fail" | "cancelled" | "running"
}

export function StatusBadge({
  children,
  variant,
  className,
}: StatusBadgeProps) {
  const badgeClassName = cn(
    styles.statusBadge,
    variant === "success" && styles.statusBadgeSuccess,
    variant === "fail" && styles.statusBadgeFail,
    variant === "cancelled" && styles.statusBadgeCancelled,
    variant === "running" && styles.statusBadgeRunning,
    className
  )

  return <div className={badgeClassName}>{children}</div>
}

function isAbortError(error: unknown) {
  if (typeof error !== "object") return false
  if (error == null) return false
  if ("code" in error && error.code === 20) return true
  return false
}
