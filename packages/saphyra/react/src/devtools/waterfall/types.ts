import type { BarSort, BarSorters } from "./sorters"

export type BarType = {
  id: string
  transitionName: string
  startedAt: Date
  endedAt: Date | "running"
  status: "running" | "fail" | "success" | "cancelled"
  label: string | null
  durationMs: number | "running"
  error?: unknown
}

export type CurrentSorters = Record<
  BarSortableProperties,
  {
    name: string
    sorter: BarSort | null
  }
>

type BarSortableProperties = keyof BarSorters

