export function filterMatched(cardById: Record<string, any>) {
  return filter(cardById, "matched")
}

export function filterVisible(cardById: Record<string, any>) {
  return filter(cardById, "visible")
}

export function filter<T extends Record<string, any>>(arr: T, state: string) {
  return Object.values(arr).reduce((acc, item) => {
    return item.state === state ? [...acc, item.id] : acc
  }, [] as string[])
}
