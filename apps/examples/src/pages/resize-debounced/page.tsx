import React, { memo, useEffect, useRef } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useHistory, useNewStore } from "saphyra/react"
import { toast } from "sonner"
import { Waterfall } from "saphyra/devtools"
import { cn } from "~/lib/cn"
import { extractErrorMessage } from "~/lib/extract-error-message"
import { noop } from "~/lib/utils"

type ResizeDebouncedState = {
  $width: number
  $initialWidth: number | null
}

type ResizeDebouncedActions =
  | {
      type: "new-width"
      payload: {
        width: number
      }
    }
  | {
      type: "resize"
      payload: {
        width: number
      }
    }
  | {
      type: "start-resize"
    }
  | {
      type: "end-resize"
    }

const newStore = newStoreDef<
  ResizeDebouncedState,
  ResizeDebouncedState,
  ResizeDebouncedActions
>({
  config: {
    onCommitTransition(props) {
      noop()
    },
  },
  reducer({ state, action, set, optimistic }) {
    if (action.type === "resize") {
      optimistic({ $width: action.payload.width })
      set({ $width: action.payload.width })
    }

    if (!state.$width) {
      set({ $width: 200 })
    }

    return state
  },
})

const Store = createStoreUtils<typeof newStore>()

export function ResizeDebouncedPage() {
  const [store, resetStore, isLoading] = useNewStore(() => newStore({}))

  useHistory(store)

  useEffect(() => {
    Object.assign(window, {
      resizeDebounced: store,
    })
  }, [store])

  Store.useErrorHandlers(error => {
    toast.error(extractErrorMessage(error))
  }, store)

  return (
    <Store.Context.Provider value={[store, resetStore, isLoading]}>
      <Content />
    </Store.Context.Provider>
  )
}

function Content() {
  const [store] = Store.useStore()
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">What is happening?</h2>
      <p>
        The "resize" action is being debounced by 50ms. The committed state is
        lagging behind the optimistic state to avoid enormous numbers of
        rerenders/paints and entries on the undo/redo history.
        <br />
        <br />
        Drag the red handle to resize the box. After you commit few state, press
        CTRL Z and CTRL Y to undo and redo.
      </p>
      <pre className="p-2 rounded border">
        <PreState />
      </pre>
      <div className="p-2 rounded border flex-1">
        <strong>Optimistic</strong>
        <Box strategy="optimistic" />
        <strong>Committed</strong>
        <Box strategy="committed" />
      </div>
      <div className="relative flex flex-col gap-4 py-4 overflow-y-scroll basis-0 grow h-full p-2 rounded-md border">
        <Waterfall
          store={store}
          extractErrorMessage={extractErrorMessage}
        />
      </div>
    </div>
  )
}

function PreState() {
  const optimisticState = Store.useSelector()
  const committedState = Store.useCommittedSelector()
  return JSON.stringify({ optimisticState, committedState }, null, 2)
}

type BoxProps = React.ComponentProps<"div"> & {
  strategy: "optimistic" | "committed"
}

const Box = memo(({ className, strategy, ...props }: BoxProps) => {
  const [store] = Store.useStore()
  const initialState = store.getOptimisticState()
  const elRef = useRef<HTMLDivElement>(null)

  if (strategy === "optimistic") {
    Store.useStoreDiff({
      on: [s => s.$width],
      run(width) {
        const element = elRef.current
        if (!element) return
        element.style.width = `${width}px`
      },
    })
  }

  if (strategy === "committed") {
    Store.useCommittedStoreDiff({
      on: [s => s.$width],
      run(width) {
        const element = elRef.current
        if (!element) return
        element.style.width = `${width}px`
      },
    })
  }

  return (
    <div
      ref={elRef}
      className={cn("h-40 bg-blue-500 relative", className)}
      style={{ width: initialState.$width }}
      {...props}
    >
      <Handle />
    </div>
  )
})

type HandleProps = React.ComponentProps<"i">

const Handle = React.forwardRef<React.ElementRef<"i">, HandleProps>(
  ({ className, ...props }, ref) => {
    const [store] = Store.useStore()
    return (
      <i
        ref={ref}
        className={cn(
          "absolute top-0 bottom-0 left-full w-1 bg-red-500 -translate-x-1/2",
          "hover:cursor-ew-resize hover:w-2 transition-all",
          className
        )}
        onMouseDown={e => {
          const startX = e.clientX
          const startWidth = store.state.$width

          const onMove = (e: MouseEvent) => {
            const dragDistance = e.clientX - startX
            const width = startWidth + dragDistance

            store.dispatch({
              type: "resize",
              payload: {
                width,
              },
              transition: ["resize"],
              beforeDispatch({ async, transition, store, action }) {
                store.abort(transition)
                async()
                  .setName("debounce")
                  .setTimeout(() => store.dispatch(action), 500)
              },
            })
          }
          const onUp = () => {
            // store.dispatch({ type: "end-resize" })
            document.removeEventListener("mousemove", onMove)
            document.removeEventListener("mouseup", onUp)
          }
          document.addEventListener("mousemove", onMove)
          document.addEventListener("mouseup", onUp)
        }}
        {...props}
      />
    )
  }
)
