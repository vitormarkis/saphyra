import { queryClient } from "~/query-client"
import { sleep } from "~/sleep"

type GetPokemonProps = {
  signal: AbortSignal
  id: number
}

let pokemons = [
  { name: "Bulbasaur", id: 0 },
  { name: "Ivysaur", id: 1 },
  { name: "Venusaur", id: 2 },
  { name: "Charmander", id: 3 },
]

export async function getPokemon({ id, signal }: GetPokemonProps) {
  // await sleep(1000, "fetching pokemon", signal)
  // // throw new Error("Not implemented yet!")
  // return pokemons[id]
  // return queryClient.ensureQueryData({
  //   queryKey: ["pokemon", id],
  //   queryFn: async ctx => {
  //     const response = await fetch(`https://pokeapi.co/api/v2/characteristic/${id}/`, {
  //       signal: ctx.signal,
  //     })
  //     return await response.json()
  //   },
  //   gcTime: 10_000, // 10s
  // })

  const response = await fetch(`https://pokeapi.co/api/v2/characteristic/${id}/`, {
    signal,
  })
  return await response.json()
}
