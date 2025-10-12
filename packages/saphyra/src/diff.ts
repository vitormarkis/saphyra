export function createCompareValues<TSource>(
  oldSource: TSource,
  newSource: TSource
) {
  return function compareValues<TSelection>(
    selector: (md: TSource) => TSelection
  ) {
    const newValue = selector(newSource)
    const oldValue = selector(oldSource)

    if (newValue instanceof Promise && oldValue instanceof Promise) {
      if ("value" in newValue) {
        return (oldValue as any)["value"] === newValue["value"]
      }
    }

    return !Object.is(oldValue, newValue)
  }
}

export function createDiffOnKeyChange<TSource>(
  oldSource: TSource,
  newSource: TSource
): [
  diff: (selectors: ((state: TSource) => any)[]) => boolean,
  diffOnKeyChange: (keys: (keyof TSource)[]) => boolean,
] {
  const compareValues = createCompareValues(oldSource, newSource)
  function diff(selectors: ((state: TSource) => any)[]) {
    return selectors.some(selector => compareValues(selector))
  }

  function diffOnKeyChange(keys: (keyof TSource)[]) {
    return diff(keys.map(key => (s: TSource) => s[key]))
  }

  return [diff, diffOnKeyChange]
}
