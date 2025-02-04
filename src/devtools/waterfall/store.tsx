import { BarType } from "./types"
import { reduceConfig } from "./fn/reduce-config"
import { createStoreUtils, newStoreDef } from "~/create-store"

type WaterfallInitialProps = {
  bars: BarType[]
}

type WaterfallState = {
  bars: BarType[]
  now: number
  $config: Record<string, number>
  $isSomeRunning: boolean
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
        status: "fail" | "success"
      }
    }

export const newWaterfallStore = newStoreDef<
  WaterfallInitialProps,
  WaterfallState & { currentTransition: null },
  WaterfallAction
>({
  onConstruct({ initialProps }) {
    return {
      bars: initialProps.bars,
      now: Date.now(),
      currentTransition: null,
    }
  },
  reducer({ prevState, state, action, diff }) {
    if (action.type === "refresh") {
      state.now = Date.now()
    }

    if (action.type === "reset") {
      state.bars = []
      state.now = Date.now()
    }

    if (action.type === "add-bar") {
      const { transitionName, id } = action.payload
      const { onCreate } = action.callbacks ?? {}
      const now = new Date()
      const newBar: BarType = {
        transitionName: transitionName,
        startedAt: now,
        endedAt: "running",
        status: "running",
        id,
      }

      state.bars = [...state.bars, newBar]
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
    }

    state.$isSomeRunning = state.bars.some(bar => bar.status === "running")

    if (diff(["now"])) {
      state.$config = state.bars.reduce(...reduceConfig(state.now))
    }

    return state
  },
})

export const WF = createStoreUtils<typeof newWaterfallStore>()
