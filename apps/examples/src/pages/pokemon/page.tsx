import { Spinner } from "@blueprintjs/core"
import { useCallback, useEffect, useState } from "react"
import { ErrorPage } from "~/components/error-page"
import { newStoreDef } from "saphyra"
import { BeforeDispatchOptions } from "saphyra"
import { cn } from "~/lib/cn"
import { getPokemon } from "~/pages/zustand-like/fn/get-pokemon"
import { Devtools } from "~/devtools/devtools"
import invariant from "tiny-invariant"
import { TextChart } from "~/components/text-chart"
import { Waterfall } from "~/devtools/waterfall"
import { createStoreUtils, useBootstrapError } from "saphyra/react"

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
      set(s => ({
        currentPokemonId: s.currentPokemonId + 1,
      }))
    }

    if (action.type === "previous") {
      set(s => ({
        currentPokemonId: s.currentPokemonId - 1,
      }))
    }

    if (diff(["currentPokemonId"])) {
      async
        .promise(async ({ signal }) => {
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
    () =>
      newPokemonStore({
        currentPokemonId: 1,
        currentTransition: null,
      }),
    []
  )
  const pokemonStoreState = useState(instantiateStore)
  const [pokemonStore] = pokemonStoreState
  const isBootstraping = Pokemon.useTransition(["bootstrap"], pokemonStore)
  const [error, tryAgain] = useBootstrapError(
    pokemonStoreState,
    instantiateStore
  )

  useEffect(() => {
    Object.assign(window, { pokemon: pokemonStore })
  }, [pokemonStore])

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

const beforeDispatch = ({
  action,
  meta,
  transition,
  transitionStore,
}: BeforeDispatchOptions<any, any>) => {
  if (transitionStore.isHappeningUnique(transition)) {
    const controller = transitionStore.controllers.get(transition)
    invariant(controller)
    controller.abort()
  }
  return action
}

export function PokemonPageContent({}: PokemonPageContentProps) {
  const [store] = Pokemon.useUseState()
  const state = Pokemon.useStore()
  const isLoadingNewPokemon = Pokemon.useTransition(["pokemon"])

  return (
    <div className="flex flex-col gap-4">
      <div className="w-fit">
        <div
          className={cn(`
        grid gap-4 mb-6

        grid-cols-[1fr,1fr]
        grid-rows-[auto,auto,auto]
        @5xl:grid-cols-[1fr,1fr,1fr]
          `)}
        >
          <TextChart.Wrapper className="h-fit w-full self-center">
            To experience the examples below{" "}
            <TextChart.Important>
              put your network to 3G on the network tab
            </TextChart.Important>{" "}
            and start testing
          </TextChart.Wrapper>
          <div className="min-w-[18rem] grid place-items-center w-full">
            <img
              className="rounded-md border border-black/50 shadow"
              src="/3g.png"
              alt=""
            />
          </div>
          <TextChart.Wrapper className="h-fit w-full min-w-0 col-span-2 @5xl:col-span-1">
            <TextChart.Title>Page example:</TextChart.Title>
            <TextChart.Text>
              If you click thousand times in the Next button and click once on
              Prev, it will cancel the fetch retrieving the next pokemon and
              will start the fetch retrieving the previous pokemon. <br />
              <br />
              <TextChart.Strong>
                All under the same transition, all under the same loading state.
              </TextChart.Strong>
              <br />
              <br />
              <TextChart.Important>
                Don't forget to check the source code!
              </TextChart.Important>
            </TextChart.Text>
          </TextChart.Wrapper>
        </div>
      </div>
      <div
        className={cn(
          "flex gap-4 p-4 border w-fit",
          isLoadingNewPokemon && "border-amber-400"
        )}
      >
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
      <div className="h-full grid grid-cols-2 gap-4">
        <Devtools store={store} />
        <Waterfall store={store} />
      </div>
      {/* <pre>{JSON.stringify({ state }, null, 2)}</pre> */}
    </div>
  )
}
