import type { Selector, Evaluator, DerivationConfig } from "./types"

export class CachedGetter<TState, TReturn> {
  private cache: TReturn | null = null
  private lastDeps: any[] | null = null
  private selectors: Selector<TState, any>[]
  private evaluator: Evaluator<any[], TReturn>

  constructor(config: DerivationConfig<TState, any[], TReturn>) {
    this.selectors = config.selectors
    this.evaluator = config.evaluator
  }

  get(state: TState): TReturn {
    // Run all selectors to get current dependencies
    const currentDeps = this.selectors.map(selector => selector(state))

    // Check if dependencies changed
    if (this.lastDeps && this.dependenciesEqual(this.lastDeps, currentDeps)) {
      return this.cache!
    }

    // Dependencies changed, recalculate
    this.lastDeps = currentDeps
    this.cache = this.evaluator(...currentDeps)
    return this.cache
  }

  private dependenciesEqual(lastDeps: any[], currentDeps: any[]): boolean {
    if (lastDeps.length !== currentDeps.length) return false

    for (let i = 0; i < lastDeps.length; i++) {
      if (lastDeps[i] !== currentDeps[i]) return false
    }

    return true
  }

  clear(): void {
    this.cache = null
    this.lastDeps = null
  }
}
