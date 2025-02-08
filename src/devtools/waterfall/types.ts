import { BarSort, BarSorters } from "./sorters"

export type BarType = {
  id: string
  transitionName: string
  startedAt: Date
  endedAt: Date | "running"
  status: "running" | "fail" | "success" | "cancelled"
}

export type CurrentSorters = Record<
  BarFilterableProperties,
  {
    name: string
    sorter: BarSort | null
  }
>

type BarFilterableProperties = keyof BarSorters
