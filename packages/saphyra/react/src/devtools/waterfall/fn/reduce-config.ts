import type { BarType } from "../types"

export const reduceConfig = (now: number) =>
  [
    (acc: Record<string, number>, bar: BarType, idx: number) => {
      acc.min = idx === 0 ? bar.startedAt.getTime() : acc.min
      acc.min =
        bar.startedAt.getTime() < acc.min ? bar.startedAt.getTime() : acc.min
      acc.max =
        idx === 0
          ? typeof bar.endedAt === "string"
            ? now
            : bar.endedAt.getTime()
          : acc.max
      acc.max =
        typeof bar.endedAt !== "string"
          ? bar.endedAt.getTime() > acc.max
            ? bar.endedAt.getTime()
            : acc.max
          : Date.now()

      acc.traveled = acc.max - acc.min
      return acc
    },
    {
      min: now,
      max: now,
    } as Record<string, number>,
  ] as const

