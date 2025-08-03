import { BarSort } from "./types"

export const sortByTransitionNameAscending: BarSort = (a, b) => {
  return a.transitionName > b.transitionName
    ? 1
    : a.transitionName < b.transitionName
      ? -1
      : 0
}

export const sortByTransitionNameDescending: BarSort = (a, b) => {
  return a.transitionName < b.transitionName
    ? 1
    : a.transitionName > b.transitionName
      ? -1
      : 0
}

export const sortByStartedAtAscending: BarSort = (a, b) => {
  return a.startedAt > b.startedAt ? 1 : a.startedAt < b.startedAt ? -1 : 0
}

export const sortByStartedAtDescending: BarSort = (a, b) => {
  return a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0
}

export const barSorters = {
  transitionName: [
    {
      name: "default",
      sorter: null as BarSort | null,
    } as const,
    {
      name: "ascending",
      sorter: sortByTransitionNameAscending,
    } as const,
    {
      name: "descending",
      sorter: sortByTransitionNameDescending,
    } as const,
  ],
  startedAt: [
    {
      name: "default",
      sorter: null as BarSort | null,
    } as const,
    {
      name: "ascending",
      sorter: sortByStartedAtAscending,
    } as const,
    {
      name: "descending",
      sorter: sortByStartedAtDescending,
    } as const,
  ],
}

export type BarSorters = typeof barSorters
