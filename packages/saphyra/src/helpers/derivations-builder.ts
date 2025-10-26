import type { DerivationConfig, DerivationsConfig } from "../types"

type SelectorValues<TState, T extends readonly ((state: TState) => any)[]> = {
  [K in keyof T]: ReturnType<T[K]>
}

export class DerivationBuilder<TState> {
  on<const TSelectors extends ((state: TState) => any)[]>(
    selectors: TSelectors
  ) {
    return {
      evaluate<TReturn>(
        evaluator: (...args: SelectorValues<TState, TSelectors>) => TReturn
      ): DerivationConfig<TState, SelectorValues<TState, TSelectors>, TReturn> {
        return {
          selectors,
          evaluator: evaluator as any,
        }
      },
    }
  }
}

export function createDerivationBuilder<TState>(): DerivationBuilder<TState> {
  return new DerivationBuilder<TState>()
}

export type DerivationsConfigFn<TState> = (
  d: () => DerivationBuilder<TState>
) => DerivationsConfig<TState>

export function createDerivationsConfig<TState>(
  configFn: DerivationsConfigFn<TState>
): DerivationsConfig<TState> {
  const d = () => createDerivationBuilder<TState>()
  return configFn(d)
}

export { createDerivationBuilder as derivationsBuilder }
