import { Spinner } from "@blueprintjs/core"
import { useCallback, useState } from "react"
import { ErrorPage } from "~/components/error-page"
import { newStoreDef } from "~/create-store"
import { useBootstrapError } from "~/create-store/hooks/useBootstrapError"
import { BeforeDispatchOptions } from "~/create-store/types"
import { createStoreUtils } from "~/createStoreUtils"
import { cn } from "~/lib/utils"
import { getPokemon } from "~/pages/zustand-like/fn/get-pokemon"

type PokemonState = {
  currentPokemonId: number
  $pokemon: Record<number, any>
  currentTransition: null
}

const newPokemonStore = newStoreDef<PokemonState, PokemonState>({
  async onConstruct({ initialProps, signal, store }) {
    return {
      currentPokemonId: initialProps.currentPokemonId,
      currentTransition: null,
    }
  },
  reducer({ prevState, state, action, diff, async, set, store }) {
    if (action.type === "next") {
      set(s => ({ currentPokemonId: s.currentPokemonId + 1 }))
    }

    if (action.type === "previous") {
      set(s => ({ currentPokemonId: s.currentPokemonId - 1 }))
    }

    if (diff(["currentPokemonId"])) {
      async
        .promise(async ({ signal }) => {
          console.log("66:x trigger promise!")
          // console.log("44: fetching pokemon!")
          return await getPokemon({
            id: state.currentPokemonId,
            signal,
          })
        })
        .onSuccess((pokemon, actor) => {
          actor.set({ $pokemon: pokemon })
        })
    }

    return state
  },
})

const Pokemon = createStoreUtils<typeof newPokemonStore>()

export function PokemonPage() {
  const instantiateStore = useCallback(
    () => newPokemonStore({ currentPokemonId: 1, currentTransition: null }),
    []
  )
  const pokemonStoreState = useState(instantiateStore)
  const [pokemonStore] = pokemonStoreState
  const isBootstraping = Pokemon.useTransition(["bootstrap"], pokemonStore)
  const [error, tryAgain] = useBootstrapError(pokemonStoreState, instantiateStore)

  if (error != null) {
    return (
      <ErrorPage
        error={error}
        tryAgain={tryAgain}
      />
    )
  }

  if (isBootstraping)
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2 h-full">
          <div className="w-full grid place-items-center">
            <Spinner size={96} />
          </div>
        </div>
      </div>
    )

  return (
    <Pokemon.Provider value={pokemonStoreState}>
      <PokemonPageContent />
    </Pokemon.Provider>
  )
}

type PokemonPageContentProps = {}

const beforeDispatch = ({ action, meta, transition, transitionStore }: BeforeDispatchOptions) => {
  // console.log("33: ", transitionStore.state.transitions)
  // if (transitionStore.isHappeningUnique(transition)) {
  //   const controller = transitionStore.controllers.get(transition)
  //   controller.abort()
  //   // console.log("66:x! ABORT!")
  // }
  return action
}

export function PokemonPageContent({}: PokemonPageContentProps) {
  const [store] = Pokemon.useUseState()
  const state = Pokemon.useStore()
  const isLoadingNewPokemon = Pokemon.useTransition(["pokemon"])

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("flex gap-4 p-4 border w-fit", isLoadingNewPokemon && "border-amber-400")}>
        <button
          onClick={() =>
            store.dispatch({
              type: "previous",
              transition: ["pokemon"],
              beforeDispatch,
            })
          }
        >
          Prev
        </button>
        {state.currentPokemonId}
        <button
          onClick={() =>
            store.dispatch({
              type: "next",
              transition: ["pokemon"],
              beforeDispatch,
            })
          }
        >
          Next
        </button>
      </div>
      <div className="h-full">
        <Pokemon.Devtools />
      </div>
      {/* <pre>{JSON.stringify({ state }, null, 2)}</pre> */}
    </div>
  )
}
