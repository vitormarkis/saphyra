import { createStoreUtils } from "saphyra/react"
import { newStoreDef } from "saphyra"
import { cn } from "~/lib/cn"
import React, { useEffect } from "react"
import { toast } from "sonner"

const INITIAL_TILES = [
  { id: "tomato", color: "red" },
  { id: "berry", color: "blue" },
  { id: "lemon", color: "green" },
  { id: "banana", color: "yellow" },
]

const newDeclarativeDragNDrop = newStoreDef({
  // derivations: {
  //   colorByTileId: {

  //   }
  // },
  reducer({
    state,
    action: event,
    set: declare,
    dispatch: emit,
    diff,
    events,
    async,
  }) {
    if (event.type === "winner-declared") {
      emit({ type: "create-new-game", transition: ["creating-new-game"] })
    }

    if (event.type === "create-new-game") {
      async().timer(() => {
        emit({ type: "reset-board", status: "won", reason: "WINNER_DECLARED" })
      }, 3000)
    }

    if (event.type === "drag-end") {
      const dropOverItself = state.dragOverWho === state.whoIsDragging
      const dropOverInvalid =
        state.dragOverWho !== state.whoIsDragging &&
        !state.allowedMapping[state.whoIsDragging]?.includes(state.dragOverWho)
      if (dropOverItself) {
        emit({ type: "drop-over-itself" })
      } else if (dropOverInvalid) {
        emit({ type: "drop-over-invalid" })
      } else {
        emit({
          type: "fetch-start",
          data: {
            sourceTileId: state.whoIsDragging,
            targetTileId: state.dragOverWho,
          },
        })
      }
    }

    if (event.type === "fetch-start") {
      setTimeout(() => {
        emit({ type: "fetch-end", data: event.data })
      })
    }

    if (event.type === "fetch-end") {
      emit({ type: "assign-tile-color", data: event.data })
    }

    declare({
      gameStatus: (() => {
        if (event.type === "drop-over-itself") return "lose"
        if (event.type === "drop-over-invalid") return "lose"
        if (event.type === "reset-board") return "playing"
        return state.gameStatus ?? "playing"
      })(),
    })

    declare({
      losingReason: (() => {
        if (event.type === "drop-over-itself") return "DRAG_OVER_HIMSELF"
        if (event.type === "drop-over-invalid") return "DRAG_OVER_INVALID"
        if (event.type === "reset-board") return null
        return state.losingReason ?? null
      })(),
    })

    declare({
      tiles: (() => {
        if (event.type === "reset-board") {
          return INITIAL_TILES
        }
        if (event.type === "assign-tile-color") {
          const { sourceTileId, targetTileId } = event.data
          const sourceTile = state.$tileByTileId[sourceTileId]
          return state.tiles.map(tile =>
            tile.id === targetTileId
              ? { ...tile, color: sourceTile.color }
              : tile
          )
        }

        return state.tiles ?? INITIAL_TILES
      })(),
    })

    declare({
      allowedMapping: (() => {
        return (
          state.allowedMapping ?? {
            tomato: ["berry"],
            berry: ["tomato", "lemon"],
            lemon: ["berry", "banana"],
            banana: ["lemon"],
          }
        )
      })(),
    })

    declare({
      whoIsDragging: (() => {
        if (event.type === "drag-start") return event.e.target.id
        if (event.type === "drag-end") return null
        return state.whoIsDragging ?? null
      })(),
    })

    declare({
      dragOverWho: (() => {
        if (event.type === "drag-over") return event.e.target.id
        if (event.type === "drag-end") return null
        return state.dragOverWho ?? null
      })(),
    })

    declare({
      isDragging: (() => {
        if (event.type === "drag-start") return true
        if (event.type === "drag-end") return false
        return state.isDragging ?? false
      })(),
    })

    declare({
      isLoading: (() => {
        if (event.type === "reset-board") return false
        if (event.type === "fetch-start") return true
        if (event.type === "fetch-end") return false
        return state.isLoading ?? false
      })(),
    })

    if (diff(["tiles"])) {
      declare({
        $allColorsOnBoard: [...new Set(state.tiles.map(tile => tile.color))],
      })
    }

    declare({
      $isAllowed:
        state.dragOverWho === state.allowedMapping[state.whoIsDragging],
    })

    if (diff(["tiles"])) {
      declare({
        $tileByTileId: (() => {
          return state.tiles.reduce((acc, tile) => {
            acc[tile.id] = tile
            return acc
          }, {})
        })(),
      })
    }

    if (diff(["$allColorsOnBoard"])) {
      declare({
        $winner:
          state.$allColorsOnBoard.length === 1
            ? state.$allColorsOnBoard[0]
            : null,
      })
    }

    if (state.gameStatus === "lose") {
      emit({ type: "reset-board", status: "lose", reason: state.losingReason })
    }

    if (diff(["$winner"])) {
      if (state.$winner) {
        emit({
          type: "winner-declared",
          data: state.$winner,
        })
      }
    }

    events.emit(event.type, event)

    return state
  },
})

const declarativeDragNDrop = newDeclarativeDragNDrop({})
Object.assign(window, { declarativeDragNDrop })

const DeclarativeDragNDrop = createStoreUtils(declarativeDragNDrop)

export function DeclarativePage() {
  const state = DeclarativeDragNDrop.useSelector()
  const isCreatingNewGame = DeclarativeDragNDrop.useTransition([
    "creating-new-game",
  ])

  useEffect(() => {
    return declarativeDragNDrop.events.on("winner-declared", event => {
      toast.success(`winner: ${event.data}`)
    })
  }, [])

  useEffect(() => {
    return declarativeDragNDrop.events.on("reset-board", event => {
      const { reason, status } = event
      if (status === "lose") {
        const reasonMapping = {
          DRAG_OVER_HIMSELF: "You can't drop a tile on itself.",
          DRAG_OVER_INVALID: "You can't drop a tile on an invalid tile.",
        }
        toast.error(reasonMapping[reason])
      }
    })
  }, [])

  return (
    <div>
      {isCreatingNewGame && (
        <div className="absolute inset-0 grid place-items-center bg-black/50 z-50">
          <h1 className="text-white text-3xl font-bold">
            Creating new game...
          </h1>
        </div>
      )}
      <pre>{JSON.stringify(keyValue(state), null, 2)}</pre>

      <div
        className={cn(
          "grid grid-cols-2 gap-6",
          state.isLoading && "opacity-50 pointer-events-none"
        )}
      >
        {state.tiles.map(tile => (
          <Tile
            key={tile.id}
            id={tile.id}
          />
        ))}
      </div>
    </div>
  )
}

const Tile = React.forwardRef(({ id, className, ...props }, ref) => {
  const state = DeclarativeDragNDrop.useSelector()
  const tile = state.$tileByTileId[id]

  return (
    <div
      ref={ref}
      id={id}
      className={cn(
        "size-48 hover:cursor-grab grid place-items-center mx-auto",
        state.allowedMapping[state.whoIsDragging]?.includes(id) &&
          "ring-2 ring-white",
        colorMapping[tile.color],
        className
      )}
      onDragStart={e =>
        declarativeDragNDrop.dispatch({ type: "drag-start", e })
      }
      onDragEnd={e => declarativeDragNDrop.dispatch({ type: "drag-end", e })}
      onDrag={e => declarativeDragNDrop.dispatch({ type: "drag", e })}
      onDragOver={e => declarativeDragNDrop.dispatch({ type: "drag-over", e })}
      onDragEnter={e =>
        declarativeDragNDrop.dispatch({ type: "drag-enter", e })
      }
      onDragLeave={e =>
        declarativeDragNDrop.dispatch({ type: "drag-leave", e })
      }
      draggable
      {...props}
    >
      <span className="opacity-50">{tile.id}</span>
    </div>
  )
})

const colorMapping = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
}

function keyValue(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .map(([key, value]) => {
        // if (key === "$allColorsOnBoard") return [key, value]
        if (typeof value === "object" && value !== null) return undefined
        return [key, value]
      })
      .filter(Boolean)
  )
}
