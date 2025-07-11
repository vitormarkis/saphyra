import { BarFilter } from "./types"

export const filterByTransitionName: BarFilter = query => bar => {
  const finalQuery = query.trim().toLowerCase()
  const finalTransitionName = bar.transitionName.trim().toLowerCase()
  if (finalQuery === "") return true
  return finalTransitionName.includes(finalQuery)
}

export const barFilters = {
  transitionName: {
    name: "default",
    filter: filterByTransitionName,
  } as const,
}

export type BarFilters = typeof barFilters
