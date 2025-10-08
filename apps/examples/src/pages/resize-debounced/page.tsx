import React, { useEffect } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useHistory, useNewStore } from "saphyra/react"
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
  reducer({
    prevState,
    state,
    action,
    set,
    async,
    dispatchAsync,
    store,
    optimistic,
  }) {
    if (action.type === "resize") {
      optimistic({ $width: action.payload.width })
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
  const optimisticState = Store.useSelector()
  const committedState = Store.useCommittedSelector()
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
        {JSON.stringify({ optimisticState, committedState }, null, 2)}
      </pre>
      <div className="p-2 rounded border flex-1">
        <strong>Optimistic</strong>
        <Box strategy="optimistic" />
        <strong>Committed</strong>
        <Box strategy="committed" />
      </div>
    </div>
  )
}

type BoxProps = React.ComponentProps<"div"> & {
  strategy: "optimistic" | "committed"
}

const Box = React.forwardRef<React.ElementRef<"div">, BoxProps>(
  ({ className, strategy, ...props }, ref) => {
    const width =
      strategy === "optimistic"
        ? Store.useSelector(s => s.$width)
        : Store.useCommittedSelector(s => s.$width)

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
                async().setTimeout(() => store.dispatch(action), 50)
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
