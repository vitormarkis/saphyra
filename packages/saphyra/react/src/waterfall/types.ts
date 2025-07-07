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

export type BarSort = (a: BarType, b: BarType) => number | undefined | null
export type BarFilter = (query: string) => (bar: BarType) => boolean

export type CurrentSorters = Record<
  string,
  {
    name: string
    sorter: BarSort | null
  }
>
