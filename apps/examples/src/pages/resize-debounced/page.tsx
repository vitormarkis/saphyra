import React, { useEffect } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { cn } from "~/lib/cn"

type ResizeDebouncedState = {
  $width: number
  $initialWidth: number | null
}

type ResizeDebouncedActions =
  | {
      type: "resize"
      payload: {
        offset: number
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
  reducer({ prevState, state, action, set, async, optimistic }) {
    set({
      $width: (() => {
        if (action.type === "resize") {
          const { offset } = action.payload
          if (typeof state.$initialWidth !== "number")
            throw new Error("Initial width is not set")
          return state.$initialWidth + offset
        }
        return state.$width ?? 200
      })(),
    })

    set({
      $initialWidth: (() => {
        if (action.type === "start-resize") return state.$width
        if (action.type === "end-resize") return null
        return state.$initialWidth ?? null
      })(),
    })

    return state
  },
})

const Store = createStoreUtils<typeof newStore>()

export function ResizeDebouncedPage() {
  const [store, resetStore, isLoading] = useNewStore(() => newStore({}))

  useEffect(() => {
    Object.assign(window, {
      resizeDebounced: store,
    })
  }, [store])

  return (
    <Store.Context.Provider value={[store, resetStore, isLoading]}>
      <Content />
    </Store.Context.Provider>
  )
}

function Content() {
  const state = Store.useSelector()
  return (
    <div className="flex flex-col gap-4">
      <pre className="p-2 rounded border">
        {JSON.stringify({ state }, null, 2)}
      </pre>
      <div className="p-2 rounded border flex-1">
        <Box />
      </div>
    </div>
  )
}

type BoxProps = React.ComponentProps<"div">

const Box = React.forwardRef<React.ElementRef<"div">, BoxProps>(
  ({ className, ...props }, ref) => {
    const width = Store.useSelector(s => s.$width)

    return (
      <div
        ref={ref}
        className={cn("h-40 bg-blue-500 relative", className)}
        style={{ width }}
        {...props}
      >
        <Handle />
      </div>
    )
  }
)

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

          // Initialize the resize operation
          store.dispatch({ type: "start-resize" })

          const onMove = (e: MouseEvent) => {
            const dragDistance = e.clientX - startX
            store.dispatch({
              type: "resize",
              payload: { offset: dragDistance },
              // transition: ["resize"],
            })
          }
          const onUp = () => {
            store.dispatch({ type: "end-resize" })
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
