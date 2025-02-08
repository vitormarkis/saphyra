import { BarType } from "~/devtools/waterfall/types"

export type BarFilter = (a: BarType, b: BarType) => number | undefined | null

export const filterByTransitionNameAscending: BarFilter = (a, b) => {
  return a.transitionName > b.transitionName
    ? 1
    : a.transitionName < b.transitionName
      ? -1
      : 0
}

export const filterByTransitionNameDescending: BarFilter = (a, b) => {
  return a.transitionName < b.transitionName
    ? 1
    : a.transitionName > b.transitionName
      ? -1
      : 0
}

export const filterByStartedAtAscending: BarFilter = (a, b) => {
  return a.startedAt > b.startedAt ? 1 : a.startedAt < b.startedAt ? -1 : 0
}

export const filterByStartedAtDescending: BarFilter = (a, b) => {
  return a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0
}

export const barFilters = {
  transitionName: [
    {
      name: "default",
      filter: null,
    } as const,
    {
      name: "ascending",
      filter: filterByTransitionNameAscending,
    } as const,
    {
      name: "descending",
      filter: filterByTransitionNameDescending,
    } as const,
  ],
  startedAt: [
    {
      name: "default",
      filter: null,
    } as const,
    {
      name: "ascending",
      filter: filterByStartedAtAscending,
    } as const,
    {
      name: "descending",
      filter: filterByStartedAtDescending,
    } as const,
  ],
}

export type BarFilters = typeof barFilters
