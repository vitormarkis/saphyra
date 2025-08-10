import type { DerivationsConfig, DerivationConfig, Transition } from "./types"
import { CachedGetter } from "./cached-getter"

export class DerivationsRegistry<TState> {
  private getters: Map<string, Map<string, CachedGetter<TState, any>>> =
    new Map()
  private derivations: DerivationsConfig<TState>

  constructor(derivations: DerivationsConfig<TState>) {
    // Initialize getters for each state type
    this.getters.set("committed", new Map())
    this.getters.set("optimistic", new Map())

    // Create cached getter instances for each derivation
    Object.entries(derivations).forEach(([key, config]) => {
      const getter = new CachedGetter(
        config as DerivationConfig<TState, any[], any>
      )
      this.getters.get("committed")!.set(key, getter)
      this.getters.get("optimistic")!.set(key, getter)
    })
    this.derivations = derivations
  }

  clear(transition: Transition) {
    const transitionKey = `transition:${transition.join(":")}`
    this.getters.delete(transitionKey)
  }

  getGetterGroups() {
    return new Set([...this.getters.keys()])
  }

  getGetter(
    stateType: "committed" | "optimistic" | string,
    key: string
  ): CachedGetter<TState, any> | undefined {
    const stateTypeGetters = this.getters.get(stateType)
    if (!stateTypeGetters || isEmptyMap(stateTypeGetters)) {
      // For transition states, create a new map if it doesn't exist
      if (!stateType.startsWith("transition:")) {
        return undefined
      }
      this.getters.set(stateType, new Map())
      return undefined
    }
    return stateTypeGetters.get(key)
  }

  getOrCreateGetter(
    stateType: "committed" | "optimistic" | string,
    key: string
  ): CachedGetter<TState, any> {
    let stateTypeGetters = this.getters.get(stateType)
    const isTransition = !stateTypeGetters || isEmptyMap(stateTypeGetters)
    if (isTransition) {
      stateTypeGetters = new Map()
      this.getters.set(stateType, stateTypeGetters)

      Object.entries(this.derivations).forEach(([key, config]) => {
        const getter = new CachedGetter(
          config as DerivationConfig<TState, any[], any>
        )
        stateTypeGetters.set(key, getter)
      })
    }

    const getter = stateTypeGetters.get(key)
    if (!getter) debugger
    return getter
  }

  injectCachedGetters(
    state: TState,
    stateType: "committed" | "optimistic" | string
  ): TState {
    const derivationKeys = this.getDerivationKeys()

    derivationKeys.forEach(key => {
      const getter = this.getOrCreateGetter(stateType, key)
      if (getter) {
        // @ts-expect-error key is keyof of state
        state[key] = () => getter.get(state)
      }
    })

    return state
  }

  clearCache(stateType?: string): void {
    if (stateType) {
      const stateTypeGetters = this.getters.get(stateType)
      if (stateTypeGetters) {
        stateTypeGetters.forEach(getter => getter.clear())
      }
    } else {
      this.getters.forEach(stateTypeGetters => {
        stateTypeGetters.forEach(getter => getter.clear())
      })
    }
  }

  getDerivationKeys(): string[] {
    const committedGetters = this.getters.get("committed")
    return committedGetters ? Array.from(committedGetters.keys()) : []
  }
}

function isEmptyMap(map: Map<string, any>): boolean {
  return map.size === 0
}
