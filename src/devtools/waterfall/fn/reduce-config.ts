import { BarType } from "../types"

export const reduceConfig = (now: number) =>
  [
    (acc: Record<string, number>, bar: BarType) => {
      acc.min ??= bar.startedAt.getTime()
      acc.min =
        bar.startedAt.getTime() < acc.min ? bar.startedAt.getTime() : acc.min
      acc.max ??= typeof bar.endedAt === "string" ? now : bar.endedAt.getTime()
      acc.max =
        typeof bar.endedAt !== "string"
          ? bar.endedAt.getTime() > acc.max
            ? bar.endedAt.getTime()
            : acc.max
          : Date.now()

      acc.traveled = acc.max - acc.min
      return acc
    },
    {} as Record<string, number>,
  ] as const
