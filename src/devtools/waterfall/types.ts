export type BarType = {
  id: string
  transitionName: string
  startedAt: Date
  endedAt: Date | "running"
  status: "running" | "fail" | "success"
}
