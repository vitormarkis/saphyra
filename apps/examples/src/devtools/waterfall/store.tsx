import { BarType, CurrentSorters } from "./types"
import { reduceConfig } from "./fn/reduce-config"
import { createStoreUtils } from "saphyra/react"
import { newStoreDef } from "saphyra"
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
  stop: boolean
  bars: BarType[]
  now: number
  distance: number
  clearTimeout: number
  state: "stale" | "fresh"
  highlightingTransition: string | null
  barSorters: BarSorters
  barFilters: BarFilters
  query: string

  getCurrentSorters: () => CurrentSorters
  getSortersFnList: () => BarSort[]
  getFiltersFnList: () => BarFilter[]
  getIsSomeRunning: () => boolean
  getDisplayingBarsIdList: () => string[]
  getConfig: () => Record<string, number>
  getDisplayingBars: () => BarType[]
  getLines: () => LineType[]
  getLinesAmount: () => number
  getBarsByBarId: () => Record<string, BarType>
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
        label: string | null
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
        error?: unknown
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
      stop: false,
      now: Date.now(),
      state: "fresh",
      barSorters,
      barFilters,
      query: "",
      highlightingTransition: null,
    }
  },
  derivations: {
    getCurrentSorters: {
      selectors: [s => s.barSorters],
      evaluator(barSorters: BarSorters) {
        return Object.fromEntries(
          Object.entries(barSorters).map(([properties, filters]) => {
            const [currentFilter] = filters
            return [properties, currentFilter]
          })
        )
      },
    },
    getSortersFnList: {
      selectors: [s => s.getCurrentSorters()],
      evaluator(currentSorters: CurrentSorters) {
        return Object.values(currentSorters)
          .map(filterType => filterType?.sorter)
          .filter(nonNullable)
      },
    },
    getFiltersFnList: {
      selectors: [s => s.barFilters],
      evaluator(barFilters: BarFilters) {
        return Object.values(barFilters).map(filterType => filterType?.filter)
      },
    },
    getDisplayingBars: {
      selectors: [
        s => s.bars,
        s => s.getFiltersFnList(),
        s => s.getSortersFnList(),
        s => s.query,
      ],
      evaluator(
        bars: BarType[],
        filterFnList: BarFilter[],
        sortersFnList: BarSort[],
        query: string
      ) {
        bars = bars.filter(bar => {
          return filterFnList.some(createFilter => {
            const filter = createFilter(query)
            return filter(bar)
          })
        })
        bars = bars.toSorted((a, b) => {
          for (const fn of sortersFnList) {
            if (!fn) continue
            const result = fn(a, b)
            if (result != null) return result
          }
          return 0
        })
        return bars
      },
    },
    getConfig: {
      selectors: [s => s.bars, s => s.now],
      evaluator: (bars, now) => {
        return bars.reduce(...reduceConfig(now))
      },
    },
    getDisplayingBarsIdList: {
      selectors: [s => s.getDisplayingBars()],
      evaluator(displayingBars: BarType[]) {
        return displayingBars.map(bar => bar.id)
      },
    },
    getLinesAmount: {
      selectors: [s => s.getConfig(), s => s.distance],
      evaluator(config, distance) {
        return Math.ceil((config.max - config.min) / distance)
      },
    },
    getLines: {
      selectors: [s => s.getLinesAmount()],
      evaluator(linesAmount: number) {
        return Array.from({ length: linesAmount }).map(
          (_, idx): LineType => ({ idx })
        )
      },
    },
    getBarsByBarId: {
      selectors: [s => s.bars],
      evaluator: bars => {
        return bars.reduce(
          (acc: Record<string, BarType>, bar: BarType) => {
            acc[bar.id] = bar
            return acc
          },
          {} as Record<string, BarType>
        )
      },
    },
    getIsSomeRunning: {
      selectors: [s => s.bars],
      evaluator(bars: BarType[]) {
        return bars.some(bar => bar.status === "running")
      },
    },
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
      const { transitionName, id, label } = action.payload
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
        durationMs: "running",
        label,
      }

      state.bars = [...state.bars, newBar]
      clearTimeout(store.uncontrolledState.clearTimeout)
      onCreate?.(newBar)
    }

    if (action.type === "end-bar") {
      const { id, status, error } = action.payload
      state.bars = state.bars.map(bar => {
        if (bar.id === id) {
          return {
            ...bar,
            endedAt: new Date(),
            status,
            error,
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

    return state
  },
})

export const WF = createStoreUtils<typeof newWaterfallStore>()

export type WaterfallStore = ReturnType<typeof newWaterfallStore>
