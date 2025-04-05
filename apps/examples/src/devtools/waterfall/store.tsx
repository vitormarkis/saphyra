import { BarType, CurrentSorters } from "./types"
import { reduceConfig } from "./fn/reduce-config"
import { createStoreUtils, newStoreDef } from "~/create-store"
import { BarSort, barSorters, BarSorters } from "~/devtools/waterfall/sorters"
import { nonNullable } from "~/lib/utils"
import { BarFilter, barFilters, BarFilters } from "./filters"

type WaterfallInitialProps = {
  bars: BarType[]
  distance: number
  clearTimeout: number
}

type LineType = {
  idx: number
}

export type WaterfallState = {
  bars: BarType[]
  $barsByBarId: Record<string, BarType>
  now: number
  distance: number
  clearTimeout: number
  state: "stale" | "fresh"
  highlightingTransition: string | null

  barSorters: BarSorters
  $currentSorters: CurrentSorters
  $sortersFnList: BarSort[]

  barFilters: BarFilters
  query: string
  $filtersFnList: BarFilter[]

  $displayingBarsIdList: string[]
  $config: Record<string, number>
  $displayingBars: BarType[]
  $isSomeRunning: boolean
  $lines: LineType[]
  $linesAmount: number
}

type WaterfallAction =
  | {
      type: "refresh"
    }
  | {
      type: "reset"
    }
  | {
      type: "add-bar"
      payload: {
        transitionName: string
        id: string
      }
      callbacks?: {
        onCreate?(bar: BarType): void
      }
    }
  | {
      type: "end-bar"
      payload: {
        id: string
        status: "fail" | "success" | "cancelled"
      }
    }
  | {
      type: "toggle-sorter"
      payload: {
        field: keyof BarSorters
      }
    }
  | {
      type: "filter"
      payload: {
        query: string
      }
    }
  | {
      type: "hover-transition-name"
      payload: {
        transitionName: string
      }
    }
  | {
      type: "hover-out-transition-name"
      payload: {
        transitionName: string
      }
    }

type WaterfallUncontrolledState = {
  clearTimeout: NodeJS.Timeout
  animationFrame: number
}

export const newWaterfallStore = newStoreDef<
  WaterfallInitialProps,
  WaterfallState,
  WaterfallAction,
  {},
  WaterfallUncontrolledState
>({
  onConstruct({ initialProps }) {
    return {
      ...initialProps,
      now: Date.now(),
      state: "fresh",
      barSorters,
      barFilters,
      query: "",
      highlightingTransition: null,
    }
  },
  reducer({ prevState, state, action, diff, store, dispatch }) {
    if (action.type === "refresh") {
      state.now = Date.now()
    }

    if (action.type === "reset") {
      state.bars = []
      state.now = Date.now()
      state.state = "fresh"
    }

    if (action.type === "add-bar") {
      const { transitionName, id } = action.payload
      const { onCreate } = action.callbacks ?? {}

      if (state.state === "stale") {
        // TODO: add dispatch with flush sync mode
        state.bars = []
        state.now = Date.now()
        state.state = "fresh"
      }

      const now = new Date()
      const newBar: BarType = {
        transitionName: transitionName,
        startedAt: now,
        endedAt: "running",
        status: "running",
        id,
      }

      state.bars = [...state.bars, newBar]
      clearTimeout(store.uncontrolledState.clearTimeout)
      onCreate?.(newBar)
    }

    if (action.type === "end-bar") {
      const { id, status } = action.payload
      state.bars = state.bars.map(bar => {
        if (bar.id === id) {
          return {
            ...bar,
            endedAt: new Date(),
            status,
          }
        }

        return bar
      })

      clearTimeout(store.uncontrolledState.clearTimeout)
      store.uncontrolledState.clearTimeout = setTimeout(() => {
        store.setState({
          state: "stale",
        })
      }, state.clearTimeout)
    }

    if (action.type === "toggle-sorter") {
      const { field } = action.payload
      const [currentFilter, ...otherFilters] = state.barSorters[field]
      state.barSorters = {
        ...state.barSorters,
        [field]: [...otherFilters, currentFilter],
      }
    }

    if (action.type === "filter") {
      state.query = action.payload.query
    }

    if (action.type === "hover-transition-name") {
      state.highlightingTransition = action.payload.transitionName
    }

    if (action.type === "hover-out-transition-name") {
      state.highlightingTransition = null
    }

    state.$isSomeRunning = state.bars.some(bar => bar.status === "running")

    if (diff(["now", "bars"])) {
      state.$config = state.bars.reduce(...reduceConfig(state.now))
    }

    if (diff(["barSorters"])) {
      state.$currentSorters = Object.fromEntries(
        Object.entries(state.barSorters).map(([properties, filters]) => {
          const [currentFilter] = filters
          return [properties, currentFilter]
        })
      ) as any
    }

    if (diff(["barFilters"])) {
      state.$currentSorters = Object.fromEntries(
        Object.entries(state.barSorters).map(([properties, filters]) => {
          const [currentFilter] = filters
          return [properties, currentFilter]
        })
      ) as any
    }

    if (diff(["$currentSorters"])) {
      state.$sortersFnList = Object.values(state.$currentSorters)
        .map(filterType => filterType?.sorter)
        .filter(nonNullable)
    }

    if (diff(["barFilters"])) {
      state.$filtersFnList = Object.values(state.barFilters).map(
        filterType => filterType?.filter
      )
    }

    state.$displayingBars = state.bars

    if (diff(["$filtersFnList", "$displayingBars", "query"])) {
      state.$displayingBars = state.$displayingBars.filter(bar => {
        return state.$filtersFnList.some(createFilter => {
          const filter = createFilter(state.query)
          return filter(bar)
        })
      })
    }

    if (diff(["$sortersFnList", "$displayingBars"])) {
      state.$displayingBars = state.$displayingBars.toSorted((a, b) => {
        for (const fn of state.$sortersFnList) {
          if (!fn) continue
          const result = fn(a, b)
          if (result != null) return result
        }
        return 0
      })
    }

    if (diff(["$displayingBars"])) {
      state.$displayingBarsIdList = state.$displayingBars.map(bar => bar.id)
    }

    state.$linesAmount = Math.ceil(
      (state.$config.max - state.$config.min) / state.distance
    )
    if (isNaN(state.$linesAmount)) {
      debugger
    }

    if (diff(["$linesAmount"])) {
      state.$lines = Array.from({ length: state.$linesAmount }).map(
        (_, idx): LineType => ({ idx })
      )
    }

    if (diff(["bars"])) {
      state.$barsByBarId = state.bars.reduce(
        (acc, bar) => {
          acc[bar.id] = bar
          return acc
        },
        {} as Record<string, BarType>
      )
    }

    return state
  },
})

export const WF = createStoreUtils<typeof newWaterfallStore>()

export type WaterfallStore = ReturnType<typeof newWaterfallStore>
