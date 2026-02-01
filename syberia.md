# Derived State API for Saphyra

## Summary of Key Concepts

This document defines a declarative API for managing derived state with async operations. Key innovations:

1. **KeyedWrappers with `Symbol.toPrimitive`**: Entities from `.key().each()` auto-convert to path tokens like `"[id='widget-123']"` when used in bracket accessors — no separate finder arguments needed.

2. **Path extraction via proxy**: Key names are extracted by passing a path-recording proxy to the key extractor function (`w => w.id` → records `["id"]`), avoiding fragile string parsing.

3. **Two patterns**:
   - **Declarative** (`.target().get/getAsync`): Single derived value with automatic pending state
   - **Imperative** (`.targets().run/runAsync`): Multiple named targets with setter functions for manual control

4. **Context-aware ancestry**: KeyedWrappers can carry their parent path, enabling shorthand like `$[widget]` that expands to full path.

5. **Dependency graph extraction**: Because targets are declarative path selectors, paths can be extracted at definition time to build staleness tracking graphs.

---

## Problem Statement

When managing state with async operations, users need a way to:

1. Declare that certain state properties depend on other properties
2. Automatically mark derived properties as **pending immediately** when their dependencies change
3. Automatically clear pending state when the async operation completes
4. Support deeply nested state structures (arrays, objects keyed by ID)
5. Work without modifying the JSON structure of state

The current approach using `diff().on().run()` with `async().promise()` requires manual tracking and the `set()` call happens after `await`, making it impossible to automatically link dependencies.

## Core Concept

Derived state is declared separately from the reducer. Dependencies are explicit. When any dependency changes:

1. The derived property is marked as **pending immediately** (same tick)
2. The async computation is triggered
3. When complete, the result is set and pending is cleared

## API Design

### Basic Structure

```typescript
const newStore = newStoreDef({
  onConstruct() {
    return {
      /* initial state */
    }
  },

  derived: d => [
    // Array of derived definitions
  ],

  reducer({ state, action, set }) {
    // Normal reducer logic
    return state
  },
})
```

### Methods

| Method                                                 | Purpose                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `.from(selector)`                                      | Select a collection (array or object) to iterate over                                |
| `.key(extractor)`                                      | **For arrays only**: Define identity extractor. Skip for objects — keys ARE identity |
| `.each(item => nested)` or `.each((item, key) => ...)` | Iterate over collection, receives KeyedWrapper (+ key for objects)                   |
| `.filter(predicate)`                                   | Conditional execution                                                                |
| `.deps([...values])`                                   | Declare dependencies (array of values or selectors)                                  |
| `.target(selector)`                                    | Where to write the result (declarative, single target)                               |
| `.get((deps...) => value)`                             | Sync computation (returns derived value)                                             |
| `.getAsync((deps...) => async (ctx) => value)`         | Async computation (curried, returns derived value)                                   |
| `.targets({...})`                                      | Define multiple named targets with path selectors (imperative pattern)               |
| `.run((deps...) => ({ setters }) => void)`             | Sync imperative handler with injected setters                                        |
| `.runAsync((deps...) => async ({ setters }) => void)`  | Async imperative handler with injected setters                                       |

### Two Patterns: Declarative vs Imperative

**Declarative** (`.target().get/getAsync`): Single derived value, automatic pending state management.

```typescript
d.deps([...])
  .target($ => $.path.to.$derivedValue)
  .getAsync((deps...) => async ({ signal, current }) => {
    return computedValue // Automatically set at target
  })
```

**Imperative** (`.targets().run/runAsync`): Multiple targets, manual control, conditional setting.

```typescript
d.deps([...])
  .targets({
    setFoo: $ => $.path.to.foo,
    setBar: $ => $.path.to.bar,
  })
  .runAsync((deps...) => async ({ signal, setFoo, setBar }) => {
    const result = await fetchData()
    if (condition) setFoo(result.foo)
    setBar(result.bar)
  })
```

### Context Objects

**`.getAsync()` context:**

```typescript
;async ({ signal, current }) => {
  // signal: AbortSignal for cancellation
  // current: current value at target path (for patching)
  return newValue
}
```

**`.runAsync()` context:**

```typescript
;async ({ signal, ...setters }) => {
  // signal: AbortSignal for cancellation
  // setters: functions named after .targets() keys (setFoo, setBar, etc.)
  setFoo(value) // Imperatively set value at target path
}
```

### KeyedWrapper

When using `.key().each()`, the callback receives a **KeyedWrapper** instead of the raw entity. The wrapper:

- Proxies all property access to the underlying value
- Carries identity info (key name, key value, parent path ancestry)
- Implements `Symbol.toPrimitive` to auto-convert to path tokens in bracket accessors
- Can be used directly in path selectors: `$.widgets[widget]` → `$.widgets["[id='widget-123']"]`

**Key insight**: KeyedWrappers convert themselves to path tokens when used as bracket accessor keys, eliminating the need for separate "finder" arguments.

```typescript
// widget[Symbol.toPrimitive]() returns "[id='widget-123']"
// So $.widgets[widget] becomes $.widgets["[id='widget-123']"]

.each(widget =>
  d.targets({
    setData: $ => $.pages[page].widgets[widget].props.$data
    //                  ^^^^^^         ^^^^^^^^
    //                  Both are KeyedWrappers with Symbol.toPrimitive
  })
)
```

---

## Examples

### 1. Top-Level Derived (Simple)

```typescript
d.deps([s => s.searchQuery, s => s.filters])
  .target(s => s.$searchResults)
  .getAsync((query, filters) => async ({ signal, current }) => {
    return await searchAPI(query, filters, signal)
  })
```

### 2. Sync Derived

```typescript
d.deps([s => s.items])
  .target(s => s.$itemCount)
  .get(items => items.length)
```

### 3. Nested Entities with Imperative Pattern

```typescript
d.from(s => s.pages)
  .key(p => p.slug)
  .each(page =>
    d
      .from(page => page.widgets)
      .key(w => w.id)
      .each(widget =>
        d
          .filter(widget.type === "chart")
          .filter(widget.props.config?.groupDimension != null)
          .from(widget => widget.props.config.groupDimension)
          .each((gd, gdIdx) =>
            d
              .deps([
                gd.dimension_name,
                widget.props.config?.datasetId,
                widget.props.widgetPresetDimensionsFilters,
                widget.props.externalFilters,
              ])
              .targets({
                setUniqueDimensions: $ =>
                  $.pages[page].widgets[widget].props.config.groupDimension[
                    gdIdx
                  ].$unique_dimensions,
              })
              .runAsync(
                (dimensionName, datasetId, filters, externalFilters) =>
                  async ({ signal, setUniqueDimensions }) => {
                    const result = await getUniqueValues(
                      dimensionName,
                      { filters, externalFilters },
                      datasetId,
                      signal
                    )
                    setUniqueDimensions(result)
                  }
              )
          )
      )
  )
```

**Note**: `page` and `widget` are KeyedWrappers. When used in `$.pages[page].widgets[widget]`, they auto-convert via `Symbol.toPrimitive` to `"[slug='my-page']"` and `"[id='widget-123']"` respectively.

### 4. Nested Entities (Object/ID-Based)

When data is already keyed by ID (e.g., `pagesById`, `widgetsById`), skip `.key()` — the object keys already provide identity:

```typescript
d.from(s => s.pagesById) // No Object.values(), no .key() needed
  .each(page =>
    d
      .from(page => page.widgetsById) // Already an object keyed by ID
      .each(widget =>
        d
          .filter(widget.type === "chart")
          .filter(widget.props.config?.groupDimensionsById != null)
          .from(widget => widget.props.config.groupDimensionsById)
          .each(
            (
              gd,
              gdId // gdId is the object key
            ) =>
              d
                .deps([gd.dimension_name, widget.props.config?.datasetId])
                .targets({
                  setUniqueDimensions: $ =>
                    $.pagesById[page].widgetsById[widget].props.config
                      .groupDimensionsById[gdId].$unique_dimensions,
                })
                .runAsync(
                  (dimensionName, datasetId) =>
                    async ({ signal, setUniqueDimensions }) => {
                      const result = await getUniqueValues(
                        dimensionName,
                        datasetId,
                        signal
                      )
                      setUniqueDimensions(result)
                    }
                )
          )
      )
  )
```

**Key insight**: `.key()` is for **arrays** where you need to establish identity. For **objects**, the keys ARE the identity — just use `.from(obj)` directly.

### 5. Derived Depends on Another Derived

```typescript
d.deps([
  s => s.$allChartWidgetIds, // Another derived value
  s => s.pagesById,
])
  .target(s => s.$chartWidgetsPreview)
  .getAsync((chartIds, pagesById) => async ({ signal, current }) => {
    return await fetchWidgetPreviews(chartIds, signal)
  })
```

### 6. Cross-Entity Dependencies (Entity + Global State)

```typescript
d.from(s => s.pagesById).each(page =>
  d
    .from(page => page.widgetsById)
    .each(widget =>
      d
        .filter(widget.type === "chart")
        .deps([
          widget.props.config?.datasetId,
          s => s.globalDateRange, // Global state
          s => s.userPreferences.timezone, // Global state
        ])
        .targets({
          setChartData: $ =>
            $.pagesById[page].widgetsById[widget].props.$chartData,
        })
        .runAsync(
          (datasetId, dateRange, timezone) =>
            async ({ signal, setChartData }) => {
              const result = await fetchChartData(
                datasetId,
                dateRange,
                timezone,
                signal
              )
              setChartData(result)
            }
        )
    )
)
```

### 7. Patching Instead of Replacing

```typescript
d.deps([s => s.cursor])
  .target(s => s.$infiniteScrollItems)
  .getAsync(cursor => async ({ signal, current }) => {
    const newBatch = await fetchNextBatch(cursor, signal)
    return [...(current ?? []), ...newBatch] // Append to existing
  })
```

### 8. Composable Extracted Functions Pattern

Extract effects into composable functions for better organization and reusability:

```typescript
// Main entry point — clean, scannable
function App(d) {
  return d
    .from(s => s.pages)
    .key(p => p.slug)
    .each(page =>
      d
        .from(page => page.widgets)
        .key(w => w.id)
        .each(widget => [
          widgetPivotTableEffects({ d, page, widget }),
          widgetChartEffects({ d, page, widget }),
        ])
    )
}

// Feature-specific grouping
function widgetChartEffects({ d, page, widget }) {
  return [widgetChartGroupDimensionEffects({ d, page, widget })]
}

function widgetChartGroupDimensionEffects({ d, page, widget }) {
  return d
    .filter(widget.type === "chart")
    .filter(widget.props.config?.groupDimension != null)
    .from(widget => widget.props.config.groupDimension)
    .each((gd, gdIdx) => [
      defineUniqueDimensions({ d, page, widget, gd, gdIdx }),
    ])
}

// Reusable target selector — extract for reuse across effects
function setUniqueDimensions({ page, widget, gdIdx }) {
  return {
    setUniqueDimensions: $ =>
      $.pages[page].widgets[widget].props.config.groupDimension[gdIdx]
        .$unique_dimensions,
  }
}

// Concrete effect definition
function defineUniqueDimensions({ d, page, widget, gd, gdIdx }) {
  return d
    .deps([
      gd.dimension_name,
      widget.props.config?.datasetId,
      widget.props.widgetPresetDimensionsFilters,
      widget.props.externalFilters,
    ])
    .targets({
      ...setUniqueDimensions({ page, widget, gdIdx }),
    })
    .runAsync(
      (dimensionName, datasetId, filters, externalFilters) =>
        async ({ signal, setUniqueDimensions }) => {
          const result = await getUniqueValues(
            dimensionName,
            { filters, externalFilters },
            datasetId,
            signal
          )
          setUniqueDimensions(result)
        }
    )
}
```

**Benefits:**

- Function names are searchable (`defineUniqueDimensions`)
- Cmd+click on function call goes to definition
- Target selectors can be extracted and reused (`setUniqueDimensions`)
- Hierarchical organization matches feature structure
- Store definition stays clean and scannable

---

## Usage in Components

```typescript
// Returns tuple: [value, isPending]
const [searchResults, isPending] = Store.useDerived(s => s.$searchResults)

const [uniqueDimensions, isUniqueDimsPending] = Store.useDerived(
  s =>
    s.pages[pageIdx].widgets[widgetIdx].props.config.groupDimension[gdIdx]
      .$unique_dimensions
)
```

---

## Performance Considerations

### Hierarchical Bail-Out

The `.from().key().each()` chain should bail out early at each level if the parent reference hasn't changed:

```
pages changed?
  ├─ No  → skip entirely
  └─ Yes → for each page:
              page changed?
                ├─ No  → skip this page
                └─ Yes → for each widget:
                            widget changed?
                              ├─ No  → skip this widget
                              └─ Yes → check deps, maybe trigger async
```

### Identity-Based Comparison (Not Index-Based)

**For arrays**: Use `.key()` to provide stable identity. This prevents bugs when arrays are reordered or items are deleted:

```typescript
d.from(page => page.widgets)  // Array
  .key(w => w.id)  // Required: establish identity
  .each(widget => ...)
```

**For objects**: Skip `.key()` — object keys already provide identity:

```typescript
d.from(page => page.widgetsById)  // Object keyed by ID
  .each((widget, widgetId) => ...)  // widgetId is the object key
```

Cache structure:

```typescript
cache = {
  "widget-123": {
    keyValue: "widget-123",
    deps: [previousDeps],
    pendingAsyncId: null,
  },
}
```

### Stable References

When using `.from()`, ensure you return stable references:

```typescript
// Bad — creates new [] every time if undefined
d.from(widget => widget.props.config?.groupDimension ?? [])

// Good — filter first, then access
d.filter(widget.props.config?.groupDimension != null).from(
  widget => widget.props.config.groupDimension
)
```

### Conditional Execution: Use `.filter()`, Not `if` Inside `.run()`

**Anti-pattern:** Using `if` statements inside `.run()` for conditional execution.

```typescript
// ❌ BAD: All targets marked as pending even when condition is false
d.deps([s => s.subscription.planType])
  .targets({ setBillingCycle: $ => $.subscription.billingCycle })
  .run((planType, { setBillingCycle }) => {
    if (planType === "enterprise") {
      setBillingCycle("yearly")
    }
  })
```

**Problem:** When `planType` changes to "basic", the system still marks `billingCycle` as pending because:

1. The dependency (`planType`) changed
2. The derived definition has a target (`billingCycle`)
3. The system doesn't know the `if` condition will prevent the setter from being called

This causes incorrect pending states — users see loading indicators for values that won't actually change.

**Correct pattern:** Use `.filter()` to bail out before targets are registered.

```typescript
// ✅ GOOD: Only enterprise plans mark billingCycle as pending
d.deps([s => s.subscription.planType])
  .filter(planType => planType === "enterprise")
  .targets({ setBillingCycle: $ => $.subscription.billingCycle })
  .run((planType, { setBillingCycle }) => {
    setBillingCycle("yearly")
  })
```

**Why this works:**

1. When `planType` is "basic", `.filter()` returns false
2. The entire derived definition is skipped — no targets registered
3. No pending state is set for `billingCycle`
4. When `planType` is "enterprise", the filter passes and the derived runs normally

**Rule of thumb:** If you find yourself writing an `if` at the top of `.run()` that guards all the setter calls, move that condition to `.filter()` instead.

```typescript
// ❌ Pattern to avoid
.run((dep, { setX }) => {
  if (condition) {
    setX(value)
  }
})

// ✅ Preferred pattern
.filter(dep => condition)
.run((dep, { setX }) => {
  setX(value)
})
```

**Exception:** It's fine to use `if` inside `.run()` when you have multiple targets and only some are conditional:

```typescript
// ✅ OK: Multiple targets with mixed conditions
.targets({
  setA: $ => $.a,
  setB: $ => $.b,
})
.run((dep, { setA, setB }) => {
  setA(computeA(dep))  // Always set
  if (dep.needsB) {
    setB(computeB(dep))  // Conditionally set
  }
})
```

In this case, consider whether splitting into separate derived definitions with individual `.filter()` clauses would be clearer.

---

## Path Selector Resolution

Path selectors use a Proxy that records property accesses and recognizes KeyedWrapper path tokens.

### Two Patterns

**Declarative** (single target):

```typescript
.target($ => $.pages[page].widgets[widget].props.$data)
```

**Imperative** (multiple named targets):

```typescript
.targets({
  setData: $ => $.pages[page].widgets[widget].props.$data,
  setMeta: $ => $.pages[page].widgets[widget].props.$meta,
})
```

### How Path Resolution Works

1. **KeyedWrappers have `Symbol.toPrimitive`** — when used as bracket accessor key, they convert to `"[keyName='keyValue']"` format
2. **Path proxy parses token format** — recognizes `[key='value']` strings and records as identity-based lookup
3. **At set-time, resolve against current state** — use key to find actual array index

### Path Instruction Format

```typescript
$.pages[page].widgets[widget].props.config.groupDimension[gdIdx].$unique_dimensions

// page[Symbol.toPrimitive]() → "[slug='my-page']"
// widget[Symbol.toPrimitive]() → "[id='widget-123']"

// Produces instruction list:
[
  { type: "prop", name: "pages" },
  { type: "find", key: "slug", value: "my-page" },
  { type: "prop", name: "widgets" },
  { type: "find", key: "id", value: "widget-123" },
  { type: "prop", name: "props" },
  { type: "prop", name: "config" },
  { type: "prop", name: "groupDimension" },
  { type: "index", value: 0 },  // Regular number
  { type: "prop", name: "$unique_dimensions" },
]
```

### Context-Aware Shorthand (Optional Enhancement)

KeyedWrappers can carry their full ancestry path, enabling shorthand:

```typescript
// Full explicit path:
$.pages[page].widgets[widget].props.$data

// Shorthand (widget carries ancestry):
$[widget].props.$data
// Expands to same path because widget.__keyed.parentPath contains pages[page].widgets
```

**Implementation hint**: When `.each()` creates a KeyedWrapper, inject the parent's path context. The path proxy can then detect a "rooted" KeyedWrapper (one with ancestry) and prepend its parentPath.

### Resolution Function

```typescript
function resolvePath(state, instructions) {
  let current = state
  let path = []

  for (const inst of instructions) {
    if (inst.type === "prop") {
      path.push(inst.name)
      current = current[inst.name]
    }
    if (inst.type === "find") {
      const idx = current.findIndex(item => item[inst.key] === inst.value)
      path.push(idx)
      current = current[idx]
    }
    if (inst.type === "index") {
      path.push(inst.value)
      current = current[inst.value]
    }
  }

  return path // e.g., ["pages", 0, "widgets", 2, "props", "$data"]
}
```

---

## Implementation Notes

### Standalone Module

This should be implemented as a standalone function/class that:

1. Accepts the `derived: d => [...]` configuration
2. Accepts a reference to the store (for reading state, setting state, subscribing)
3. Manages its own internal cache for:
   - Entity keys and key extractors
   - Previous dependency values
   - Pending async operation IDs
4. Exposes methods for:
   - Processing after reducer runs (check deps, trigger async)
   - Querying pending state for a given selector
   - Cleanup on store disposal

### KeyedWrapper Implementation

KeyedWrappers are Proxies that carry identity and ancestry information, with `Symbol.toPrimitive` for automatic path token conversion.

```typescript
interface KeyedInfo {
  keyName: string // "id" — extracted from key extractor
  keyValue: string | number // "widget-123" — actual value
  parentPath: PathInstruction[] // Ancestry from root (for context-aware paths)
}

type KeyedWrapper<T> = T & {
  __keyed: KeyedInfo
  [Symbol.toPrimitive]: () => string // Returns "[id='widget-123']"
}
```

**Implementation hints for LLM:**

1. **Extract key name via path-recording proxy**: Instead of parsing function strings, pass a proxy to the key extractor that records property access:

```typescript
function extractKeyPath(extractor: (item: any) => any): string[] {
  const path: string[] = []
  const recorder = new Proxy({}, {
    get(_, prop: string) {
      path.push(prop)
      return recorder // Allow chaining: w.meta.id
    }
  })
  extractor(recorder)
  return path // ["id"] or ["meta", "externalId"]
}

// Usage in .key():
.key(w => w.id)  // extractKeyPath returns ["id"]
.key(w => w.meta.slug)  // extractKeyPath returns ["meta", "slug"]
```

2. **Symbol.toPrimitive enables bracket accessor usage**: When a KeyedWrapper is used as a property key (e.g., `$.widgets[widget]`), JavaScript calls `Symbol.toPrimitive` to coerce it to a string. Return the path token format:

```typescript
// In Proxy get trap:
if (prop === Symbol.toPrimitive) {
  return () => `[${keyName}='${keyValue}']`
  // e.g., "[id='widget-123']"
}
```

3. **Context-aware ancestry**: Each KeyedWrapper can carry its parent path, enabling shorthand selectors:

```typescript
// widget knows it came from: pages[slug='my-page'].widgets
// So $[widget] can expand to full path automatically

interface KeyedInfo {
  keyName: string
  keyValue: string | number
  parentPath: PathInstruction[] // Ancestry injected by parent .each()
}
```

4. **Path proxy recognizes token format**: The path selector proxy parses `[key='value']` strings:

```typescript
// In path proxy get trap:
const match = prop.match(/^\[(\w+)='(.+)'\]$/)
if (match) {
  return createPathProxy([
    ...instructions,
    { type: "find", key: match[1], value: match[2] },
  ])
}
```

### Integration Points with Saphyra

1. **After reducer runs**: Process all derived definitions, check for changed deps, trigger async
2. **On async complete**: Set result at target path, clear pending state, notify subscribers
3. **`useDerived` hook**: Subscribe to both value and pending state for a given selector
4. **Abort handling**: When deps change while async is in-flight, abort previous operation

### Dependency Graph and Staleness Tracking

Because `.targets()` uses declarative path selectors (not opaque callbacks), we can extract concrete paths and build a dependency graph.

**What's extractable:**

| Source                               | Extracted Information                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `.targets({ setX: $ => $.path... })` | Concrete paths where values will be written                             |
| `.deps([...])`                       | Values that trigger recalculation (optionally paths if using selectors) |

**Path instruction format from selectors:**

```typescript
$.pages[page].widgets[widget].props.$data

// Produces:
[
  { type: 'prop', name: 'pages' },
  { type: 'find', key: 'slug', value: 'my-page' },
  { type: 'prop', name: 'widgets' },
  { type: 'find', key: 'id', value: 'widget-123' },
  { type: 'prop', name: 'props' },
  { type: 'prop', name: '$data' },
]

// Serializable to: "pages.[slug='my-page'].widgets.[id='widget-123'].props.$data"
```

**Use cases enabled by path extraction:**

1. **Forward lookup**: "If I set path X, what derived values become stale?"
2. **Cascade invalidation**: Automatically mark downstream derived values as pending
3. **Visualization**: Render dependency graph for debugging
4. **Optimization**: Skip recalculation if changed paths don't affect a derived's deps

**Implementation hint**: At definition time, evaluate all `.targets()` selectors against a path-recording proxy to build a registry of `path → [derived definitions that target this path]`. When any path is set, consult this registry to determine what needs re-evaluation.

---

### Key Constraints

- No TypeScript types used for runtime behavior
- No modification to JSON state structure
- Dependencies must be declared explicitly (no runtime Proxy tracking of reads)
- The curried `.getAsync()` / `.runAsync()` pattern ensures deps are received synchronously, async context is separate
- `.get()` / `.run()` for sync, `.getAsync()` / `.runAsync()` for async
- **Arrays**: Use `.key()` before `.each()` to establish identity
- **Objects**: Skip `.key()` — object keys are the identity; `.each((item, key) => ...)` receives the key
- KeyedWrappers use `Symbol.toPrimitive` to auto-convert to path tokens in bracket accessors
- Path selectors are evaluated at definition time to enable dependency graph construction
