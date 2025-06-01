export function groupByKey<
  T extends Record<string | number, any>,
  K extends keyof T = string,
>(source: T[], key: K) {
  return groupByFn(source, item => item[key])
}

export function groupByFn<
  T extends Record<string | number, any>,
  K extends keyof T = string,
>(source: T[], fn: (item: T) => K) {
  return source.reduce(
    (acc, item) => {
      const key = fn(item) as string | number
      acc[key] = item
      return acc
    },
    {} as Record<string | number, T>
  )
}
