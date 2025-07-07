import { BarType, CurrentSorters, BarSort, BarFilter } from "./types"
import { reduceConfig } from "./fn/reduce-config"
import { createStoreUtils } from "../createStoreUtils"
import { newStoreDef } from "../../../src"
import { barSorters, BarSorters } from "./sorters"
import { nonNullable } from "./utils"
import { barFilters, BarFilters } from "./filters"

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
  Record<string, never>,
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
  reducer({ state, action, store, dispatch }) {
    switch (action.type) {
      case "refresh": {
        return {
          ...state,
          now: Date.now(),
          state: "fresh",
        }
      }
      case "reset": {
        return {
          ...state,
          bars: [],
          now: Date.now(),
          state: "fresh",
        }
      }
      case "add-bar": {
        const newBar: BarType = {
          id: action.payload.id,
          transitionName: action.payload.transitionName,
          startedAt: new Date(),
          endedAt: "running",
          status: "running",
          label: action.payload.label,
          durationMs: "running",
        }

        action.callbacks?.onCreate?.(newBar)

        return {
          ...state,
          bars: [...state.bars, newBar],
          now: Date.now(),
          state: "fresh",
        }
      }
      case "end-bar": {
        const bars = state.bars.map(bar => {
          if (bar.id === action.payload.id) {
            const endedAt = new Date()
            return {
              ...bar,
              endedAt,
              status: action.payload.status,
              error: action.payload.error,
              durationMs: endedAt.getTime() - bar.startedAt.getTime(),
            } as BarType
          }
          return bar
        })

        // Schedule cleanup after clearTimeout
        const uncontrolledState = store.uncontrolledState
        if (uncontrolledState.clearTimeout) {
          clearTimeout(uncontrolledState.clearTimeout)
        }

        const newClearTimeout = setTimeout(() => {
          dispatch({ type: "refresh" })
        }, state.clearTimeout)

        store.uncontrolledState = {
          ...uncontrolledState,
          clearTimeout: newClearTimeout,
        }

        return {
          ...state,
          bars,
          now: Date.now(),
          state: "fresh",
        }
      }
      case "toggle-sorter": {
        const field = action.payload.field
        const currentSorters = state.barSorters[field]
        const currentIndex = currentSorters.findIndex(
          sorter => sorter === currentSorters[0]
        )
        const nextIndex = (currentIndex + 1) % currentSorters.length

        const newSorters = [...currentSorters]
        const [nextSorter] = newSorters.splice(nextIndex, 1)
        newSorters.unshift(nextSorter)

        return {
          ...state,
          barSorters: {
            ...state.barSorters,
            [field]: newSorters,
          },
          state: "fresh",
        }
      }
      case "filter": {
        return {
          ...state,
          query: action.payload.query,
          state: "fresh",
        }
      }
      case "hover-transition-name": {
        return {
          ...state,
          highlightingTransition: action.payload.transitionName,
        }
      }
      case "hover-out-transition-name": {
        return {
          ...state,
          highlightingTransition: null,
        }
      }
      default: {
        return state
      }
    }
  },
})

export type WaterfallStore = ReturnType<typeof newWaterfallStore>
export const WF = createStoreUtils<typeof newWaterfallStore>()
