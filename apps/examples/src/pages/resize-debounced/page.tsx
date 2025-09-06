import React, { useEffect } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { toast } from "sonner"
import { cn } from "~/lib/cn"
import { extractErrorMessage } from "~/lib/extract-error-message"

type ResizeDebouncedState = {
  $width: number
  $initialWidth: number | null
}

type ResizeDebouncedActions =
  | {
      type: "resize-async"
      payload: {
        width: number
      }
    }
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
  reducer({ prevState, state, action, set, async, dispatchAsync, store }) {
    if (action.type === "resize") {
      async().promise(async () => {
        await new Promise(resolve => setTimeout(resolve))
        await dispatchAsync({
          type: "resize-async",
          payload: { width: action.payload.width },
          transition: ["random"],
        })
      })
    }

    if (action.type === "resize-async") {
      async().promise(async () => {
        await new Promise(resolve => setTimeout(resolve))
        dispatchAsync({
          type: "new-width",
          payload: { width: action.payload.width },
        })
      })
    }

    set({
      $width: (() => {
        if (action.type === "new-width") {
          return action.payload.width
        }
        return state.$width ?? 200
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
                // return action
                async().setTimeout(() => store.dispatch(action), 400)
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
