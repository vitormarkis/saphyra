import {
  type AnyDefinition,
  type DerivedDefinition,
  type FromEachDefinition,
  isFromEachDefinition,
} from "./derived-builder"
import type { PathInstruction } from "../path/path-instruction"
import { resolvePath, setPath } from "../path/path-instruction"
import { createKeyedWrapper } from "../path/keyed-wrapper"
import { AsyncRunner } from "../async/async-runner"
import { TransitionsStore, type Transition } from "../transitions"

export type SetStateFn<TState> = (setter: (state: TState) => TState) => void

export class DerivedEngine<TState extends Record<string, any>> {
  private cache: Map<string, any[]> = new Map()
  private asyncRunner: AsyncRunner
  private transitionsStore: TransitionsStore

  constructor(
    private definitions: AnyDefinition[],
    transitionsStore: TransitionsStore
  ) {
    this.transitionsStore = transitionsStore
    this.asyncRunner = new AsyncRunner(transitionsStore)
  }

  process(state: TState, setState: SetStateFn<TState>) {
    for (const def of this.definitions) {
      if (isFromEachDefinition(def)) {
        this.processFromEach(def, state, setState, [])
      } else {
        this.processDerived(def, state, setState, [])
      }
    }
  }

  private processFromEach(
    def: FromEachDefinition,
    state: TState,
    setState: SetStateFn<TState>,
    parentPath: PathInstruction[]
  ) {
    const collection = def.fromSelector(state)
    if (!Array.isArray(collection)) return

    const keyName = def.keyPath[def.keyPath.length - 1]
    const fromPath = this.extractPathFromSelector(def.fromSelector)

    for (const item of collection) {
      const keyValue = def.keyExtractor(item)
      const currentPath: PathInstruction[] = [
        ...parentPath,
        ...fromPath,
        { type: "find", key: keyName, value: keyValue },
      ]
      const keyedItem = createKeyedWrapper(item, keyName, keyValue, currentPath)

      // Call the callback to get nested definitions
      const result = def.eachCallback(keyedItem)

      if (result) {
        // Process the result - it could be a definition, array of definitions, or builder
        const nestedDefs = this.normalizeResult(result)
        for (const nestedDef of nestedDefs) {
          if (isFromEachDefinition(nestedDef)) {
            // For nested from/each, we need to evaluate the fromSelector against the current item
            const scopedFromEach: FromEachDefinition = {
              ...nestedDef,
              fromSelector: (s: any) => nestedDef.fromSelector(keyedItem),
            }
            this.processFromEach(scopedFromEach, state, setState, currentPath)
          } else {
            this.processDerived(nestedDef, state, setState, currentPath)
          }
        }
      }
    }
  }

  private normalizeResult(result: any): AnyDefinition[] {
    if (!result) return []
    
    // If it's a DerivedBuilder, get its definitions
    if (result && typeof result.getDefinitions === "function") {
      return result.getDefinitions()
    }
    
    // If it's an array, flatten it
    if (Array.isArray(result)) {
      return result.flatMap(r => this.normalizeResult(r))
    }
    
    // If it has a 'kind' or 'type' property, it's a definition
    if (result.kind === "from-each" || result.type) {
      return [result]
    }
    
    return []
  }

  private processDerived(
    def: DerivedDefinition,
    state: TState,
    setState: SetStateFn<TState>,
    parentPath: PathInstruction[]
  ) {
    if (!def.deps || def.deps.length === 0) return

    const cacheKey = this.getCacheKey(def, parentPath)
    const currentDeps = def.deps.map(dep => {
      try {
        // Extract path from selector and resolve against state
        const path = this.extractPathFromSelectorFn(dep)
        if (path.length > 0) {
          const resolved = resolvePath(state, path)
          return resolved.value
        }
        return dep(state)
      } catch {
        return undefined
      }
    })
    const prevDeps = this.cache.get(cacheKey)

    // Check if deps changed
    const depsChanged =
      !prevDeps ||
      prevDeps.length !== currentDeps.length ||
      prevDeps.some((prev: any, i: number) => prev !== currentDeps[i])

    if (!depsChanged) return

    // Update cache
    this.cache.set(cacheKey, currentDeps)

    if (def.type === "sync") {
      this.executeSync(def, currentDeps, state, setState, parentPath)
    } else if (def.type === "async") {
      this.executeAsync(def, currentDeps, state, setState, parentPath)
    }
  }

  private executeSync(
    def: DerivedDefinition,
    deps: any[],
    state: TState,
    setState: SetStateFn<TState>,
    parentPath: PathInstruction[]
  ) {
    if (def.pattern === "declarative" && def.targetPath) {
      const result = def.handler(...deps)
      // targetPath is already absolute (from root), don't prepend parentPath
      const fullPath = def.targetPath
      setState(prevState => setPath(prevState, fullPath, result))
    } else if (def.pattern === "imperative" && def.targetPaths) {
      const setters: Record<string, (value: any) => void> = {}
      for (const [name, path] of Object.entries(def.targetPaths)) {
        // targetPaths are already absolute (from root), don't prepend parentPath
        setters[name] = (value: any) => {
          setState(prevState => setPath(prevState, path, value))
        }
      }
      def.handler(...deps)(setters)
    }
  }

  private executeAsync(
    def: DerivedDefinition,
    deps: any[],
    state: TState,
    setState: SetStateFn<TState>,
    parentPath: PathInstruction[]
  ) {
    const transition = this.getTransition(def, parentPath)
    const controller = new AbortController()

    if (def.pattern === "declarative" && def.targetPath) {
      // targetPath is already absolute (from root)
      const fullPath = def.targetPath
      let current: any
      try {
        const resolved = resolvePath(state, fullPath)
        current = resolved.value
      } catch {
        current = undefined
      }

      const asyncFn = def.handler(...deps)
      this.asyncRunner.run(transition, controller.signal, async ({ signal }) => {
        const result = await asyncFn({ signal, current })
        setState(prevState => setPath(prevState, fullPath, result))
      })
    } else if (def.pattern === "imperative" && def.targetPaths) {
      const setters: Record<string, (value: any) => void> = {}
      for (const [name, path] of Object.entries(def.targetPaths)) {
        // targetPaths are already absolute (from root)
        setters[name] = (value: any) => {
          setState(prevState => setPath(prevState, path, value))
        }
      }

      const asyncFn = def.handler(...deps)
      this.asyncRunner.run(transition, controller.signal, async ({ signal }) => {
        await asyncFn({ signal, ...setters })
      })
    }
  }

  private getTransition(def: DerivedDefinition, parentPath: PathInstruction[]): Transition {
    if (def.targetPath) {
      return def.targetPath.map(inst => {
        if (inst.type === "prop") return inst.name
        if (inst.type === "find") return `${inst.key}=${inst.value}`
        return String(inst.value)
      })
    }
    return ["derived"]
  }

  private getCacheKey(def: DerivedDefinition, parentPath: PathInstruction[]): string {
    const pathStr = parentPath.map(p => JSON.stringify(p)).join(":")
    const targetStr = def.targetPath?.map(p => JSON.stringify(p)).join(":") ?? ""
    return `${pathStr}|${targetStr}`
  }

  private extractPathFromSelector(selector: (state: any) => any): PathInstruction[] {
    const path: PathInstruction[] = []
    const proxy = new Proxy({}, {
      get(_, prop: string) {
        path.push({ type: "prop", name: prop })
        return proxy
      },
    })
    try {
      selector(proxy as any)
    } catch {
      // Path extraction completed
    }
    return path
  }

  private extractPathFromSelectorFn(selector: (state: any) => any): PathInstruction[] {
    const path: PathInstruction[] = []
    
    const createProxy = (): any => new Proxy({}, {
      get(_, prop: string | symbol) {
        if (prop === Symbol.toPrimitive) {
          return () => ""
        }
        
        const propStr = String(prop)
        
        // Check if prop is a KeyedWrapper token like "[id='123']"
        const tokenMatch = propStr.match(/^\[(\w+)='(.+)'\]$/)
        if (tokenMatch) {
          const [, keyName, keyValue] = tokenMatch
          path.push({ type: "find", key: keyName, value: keyValue })
          return createProxy()
        }
        
        // Regular property access
        path.push({ type: "prop", name: propStr })
        return createProxy()
      },
    })
    
    try {
      selector(createProxy())
    } catch {
      // Path extraction completed
    }
    return path
  }

  clearCache() {
    this.cache.clear()
  }
}
