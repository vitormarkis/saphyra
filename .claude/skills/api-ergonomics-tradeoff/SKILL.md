---
name: api-ergonomics-tradeoff
description: Proposes discussions when API design choices involve significant trade-offs between ergonomics and implementation complexity. Use when implementing libraries, designing APIs, or when a requested API would require disproportionate implementation effort compared to simpler alternatives.
---

# API Ergonomics vs Implementation Complexity

## When This Applies

When implementing a library or API feature, if:

- The ideal/requested API requires **significantly more code** (e.g., 10x) than a simpler alternative
- The simpler alternative provides **similar value** with minor ergonomic differences
- The complexity adds maintenance burden or potential bugs

Then **propose a discussion** before implementing the complex version.

## How to Propose

Present the trade-off clearly:

```markdown
**API Trade-off Discussion**

The requested API:
```[show the ideal API usage]```

Would require ~X lines to implement because [reason].

A simpler alternative:
```[show the alternative API]```

Requires only ~Y lines because [reason].

The difference:
- [What the user gives up]
- [What the user gains: simpler internals, fewer bugs, easier maintenance]

Which approach do you prefer?
```

## Examples

### Implicit vs Explicit Parameter

**Complex (implicit):**

```typescript
// Callback uses parent builder implicitly
.each(item => d.from(...))  // 500 LOC to track/isolate builder state
```

**Simpler (explicit):**

```typescript
// Callback receives fresh builder
.each((item, d) => d.from(...))  // 50 LOC, no state tracking needed
```

### Magic Inference vs Explicit Declaration

**Complex (magic):**

```typescript
// Infers everything from usage patterns
store.derived($ => $.fullName = $.first + $.last)
```

**Simpler (explicit):**

```typescript
// Explicit deps/target declaration
store.deps([$ => $.first, $ => $.last])
    .target($ => $.fullName)
    .get((first, last) => first + last)
```

## Decision Factors

Favor the **complex API** when:

- It's a core, frequently-used pattern
- The ergonomic benefit is substantial
- The implementation is well-understood and stable

Favor the **simpler API** when:

- It's a v1/experimental feature
- The complexity introduces edge cases or bugs
- The ergonomic difference is minor
- Maintenance burden is a concern

## Key Principle

> A slightly less ergonomic API that's correct and maintainable beats a beautiful API that's buggy or unmaintainable.
