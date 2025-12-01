import { BarFilter, BarFilters } from "./filters"
import { BarSort, BarSorters } from "./sorters"

export type BarKind = "queue" | "onFinish" | "user"

export type BarType = {
  id: string
  transitionName: string
  startedAt: Date
  endedAt: Date | "running"
  status: "running" | "fail" | "success" | "cancelled"
  label: string | null
  kind: BarKind
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
