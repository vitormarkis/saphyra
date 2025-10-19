type SelectorValues<TState, T extends readonly ((state: TState) => any)[]> = {
  [K in keyof T]: ReturnType<T[K]>
}

export function createDiffBuilder<TState>(prevState: TState, newState: TState) {
  return () => ({
    on<const TSelectors extends ((state: TState) => any)[]>(
      selectors: TSelectors
    ) {
      return {
        run<TArgs extends SelectorValues<TState, TSelectors>>(
          run: (...args: TArgs) => void
        ) {
          const hasChanges = selectors.some(
            selector => selector(prevState) !== selector(newState)
          )
          if (hasChanges) {
            run(...(selectors.map(selector => selector(newState)) as TArgs))
          }
        },
      }
    },
  })
}

export type DiffBuilder<TState> = typeof createDiffBuilder<TState>
export type Diff<TState> = ReturnType<DiffBuilder<TState>>
