type SelectorValues<TState, T extends readonly ((state: TState) => any)[]> = {
  [K in keyof T]: ReturnType<T[K]>
}

export function createDiffBuilder<TState>(prevState: TState, newState: TState) {
  return () => ({
    on<const TSelectors extends ((state: TState) => any)[]>(
      selectors: TSelectors
    ) {
      const changes = selectors.map(selector => {
        let prevValue: any
        try {
          prevValue = selector(prevState)
        } catch {
          prevValue = undefined
        }
        const newValue = selector(newState)
        return prevValue !== newValue ? [prevValue, newValue] : undefined
      })

      return {
        changes,
        run<TArgs extends SelectorValues<TState, TSelectors>>(
          run: (this: typeof changes, ...args: TArgs) => void
        ) {
          const hasChanges = changes.some(change => change !== undefined)
          if (hasChanges) {
            run.call(
              changes,
              ...(selectors.map(selector => selector(newState)) as TArgs)
            )
          }
        },
      }
    },
    changed<TSelector extends (state: TState) => any>(
      selector: TSelector
    ): boolean {
      const prevValue = selector(prevState)
      const newValue = selector(newState)
      return prevValue !== newValue
    },
  })
}

export type DiffBuilder<TState> = typeof createDiffBuilder<TState>
export type Diff<TState> = ReturnType<DiffBuilder<TState>>
