import type { PathInstruction } from "../path/path-instruction"
import { createPathSelector, extractKeyPath } from "../path/path-selector"
import { type KeyedWrapper } from "../path/keyed-wrapper"

export type DependencySelector<TState, TValue> = (state: TState) => TValue

type DepValues<TDeps extends readonly DependencySelector<any, any>[]> = {
  [K in keyof TDeps]: TDeps[K] extends DependencySelector<any, infer TValue>
    ? TValue
    : never
}

export type DerivedDefinition<TState = any> = {
  type: "sync" | "async"
  pattern: "declarative" | "imperative"
  deps: readonly DependencySelector<TState, any>[]
  targetPath?: PathInstruction[]
  targetPaths?: Record<string, PathInstruction[]>
  handler: any
}

export type FromEachDefinition<TState = any> = {
  kind: "from-each"
  fromSelector: DependencySelector<TState, any>
  keyExtractor: (item: any) => any
  keyPath: string[]
  eachCallback: (item: any, key?: string) => any
}

export type AnyDefinition<TState = any> =
  | DerivedDefinition<TState>
  | FromEachDefinition<TState>

export function isFromEachDefinition(
  def: AnyDefinition
): def is FromEachDefinition {
  return (def as any).kind === "from-each"
}

export class DerivedBuilder<TState> {
  private definitions: AnyDefinition<TState>[] = []

  constructor(definitions: AnyDefinition<TState>[] = []) {
    this.definitions = definitions
  }

  from<TCollection>(
    selector: (state: TState) => TCollection
  ): FromBuilder<TState, TCollection> {
    return new FromBuilder(this, selector as any)
  }

  deps<const TDeps extends readonly DependencySelector<TState, any>[]>(
    dependencies: TDeps
  ): DepsBuilder<TState, TDeps> {
    return new DepsBuilder(this, dependencies as TDeps)
  }

  getDefinitions(): AnyDefinition<TState>[] {
    return this.definitions
  }

  addDefinition(def: AnyDefinition<TState>) {
    this.definitions.push(def)
  }
}

export class FromBuilder<TState, TCollection> {
  constructor(
    private parent: DerivedBuilder<TState>,
    private fromSelector: DependencySelector<any, any>
  ) {}

  key<TKey>(
    extractor: (item: TCollection extends (infer T)[] ? T : never) => TKey
  ): KeyBuilder<TState, TCollection> {
    const keyPath = extractKeyPath(extractor as any)
    return new KeyBuilder(
      this.parent,
      this.fromSelector,
      extractor as any,
      keyPath
    )
  }
}

export class KeyBuilder<TState, TCollection> {
  constructor(
    private parent: DerivedBuilder<TState>,
    private fromSelector: DependencySelector<any, any>,
    private keyExtractor: (item: any) => any,
    private keyPath: string[]
  ) {}

  /**
   * Iterate over each item in the collection and define derived computations.
   *
   * The callback receives:
   * - `item`: A KeyedWrapper containing the item and identity info
   * - `d`: A fresh DerivedBuilder for defining nested derivations
   *
   * Return the result of calling methods on `d` (like `d.from()...` or `d.deps()...`).
   */
  each<TResult>(
    callback: (
      item: TCollection extends (infer T)[] ? KeyedWrapper<T> : never,
      d: DerivedBuilder<TState>
    ) => TResult
  ): FromEachDefinition<TState> {
    // Wrap the callback to provide a fresh builder each time
    const wrappedCallback = (item: any) => {
      const freshBuilder = new DerivedBuilder<TState>()
      return callback(item, freshBuilder)
    }

    const def: FromEachDefinition<TState> = {
      kind: "from-each",
      fromSelector: this.fromSelector,
      keyExtractor: this.keyExtractor,
      keyPath: this.keyPath,
      eachCallback: wrappedCallback,
    }
    this.parent.addDefinition(def)
    return def
  }
}

export class DepsBuilder<
  TState,
  TDeps extends readonly DependencySelector<TState, any>[],
> {
  constructor(
    private parent: DerivedBuilder<TState>,
    private deps: TDeps
  ) {}

  target(selector: (state: TState) => any): TargetBuilder<TState, TDeps> {
    const targetPath = createPathSelector(selector as any)
    return new TargetBuilder(this.parent, this.deps, targetPath)
  }

  targets(
    setters: Record<string, (state: TState) => any>
  ): TargetsBuilder<TState, TDeps> {
    const targetPaths: Record<string, PathInstruction[]> = {}
    for (const [name, selector] of Object.entries(setters)) {
      targetPaths[name] = createPathSelector(selector as any)
    }
    return new TargetsBuilder(this.parent, this.deps, targetPaths)
  }
}

export class TargetBuilder<
  TState,
  TDeps extends readonly DependencySelector<TState, any>[],
> {
  constructor(
    private parent: DerivedBuilder<TState>,
    private deps: TDeps,
    private targetPath: PathInstruction[]
  ) {}

  get<TResult>(
    handler: (...deps: DepValues<TDeps>) => TResult
  ): DerivedDefinition {
    const def: DerivedDefinition = {
      type: "sync",
      pattern: "declarative",
      deps: this.deps,
      targetPath: this.targetPath,
      handler,
    }
    return def
  }

  getAsync<TResult>(
    handler: (
      ...deps: DepValues<TDeps>
    ) => (ctx: { signal: AbortSignal; current?: any }) => Promise<TResult>
  ): DerivedDefinition {
    const def: DerivedDefinition = {
      type: "async",
      pattern: "declarative",
      deps: this.deps,
      targetPath: this.targetPath,
      handler,
    }
    return def
  }
}

export class TargetsBuilder<
  TState,
  TDeps extends readonly DependencySelector<TState, any>[],
> {
  constructor(
    private parent: DerivedBuilder<TState>,
    private deps: TDeps,
    private targetPaths: Record<string, PathInstruction[]>
  ) {}

  run(
    handler: (...deps: DepValues<TDeps>) => (setters: any) => void
  ): DerivedDefinition {
    const def: DerivedDefinition = {
      type: "sync",
      pattern: "imperative",
      deps: this.deps,
      targetPaths: this.targetPaths,
      handler,
    }
    return def
  }

  runAsync(
    handler: (
      ...deps: DepValues<TDeps>
    ) => (
      ctx: { signal: AbortSignal } & Record<string, (v: any) => void>
    ) => Promise<void>
  ): DerivedDefinition {
    const def: DerivedDefinition = {
      type: "async",
      pattern: "imperative",
      deps: this.deps,
      targetPaths: this.targetPaths,
      handler,
    }
    return def
  }
}
