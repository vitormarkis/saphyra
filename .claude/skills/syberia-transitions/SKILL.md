---
name: syberia-transitions
description: Comprehensive guide to transitions in Syberia stores. Use when working with async operations, derived computations, dispatch actions, or tracking loading states. Transitions are caller-owned branches that prevent conflicts when multiple actions trigger the same derived computation. Covers transition semantics, explicit transitions for async derived, reserved bootstrap transition, and action-provided transitions.
---

# Syberia Transitions

## Core Concept

Transitions are **caller-owned branches** that prevent conflicts when multiple actions trigger the same derived computation. They represent what the user is doing, not where data is stored.

### The Problem Transitions Solve

When a derived value depends on multiple state properties, different actions can trigger the same derivation:

```typescript
// Derived computation depends on both `done` and `title`
derived: d => [
  d.deps([
    $ => $.pages[page].columns[col].cards[card].done,
    $ => $.pages[page].columns[col].cards[card].title,
  ])
  .target($ => $.pages[page].columns[col].cards[card].title)
  .getAsync((done, title) => async ({ signal }) => {
    // Async computation
  })
]
```

If you dispatch `toggle-card` and `rename-card` simultaneously, both trigger the same async derived computation. Without transitions, these operations would conflict.

### The Solution

Each dispatch caller provides a **transition name** - a branch identifier. Async derived work registers under the transition that triggered the state change. Whoever resolves last writes the final value.

```typescript
// Toggle action uses its own transition branch
store.dispatch({
  type: "toggle-card",
  cardId: "card-1",
  transition: ["p1", "c1", "card-1", "toggle-card"]
})

// Rename action uses a different transition branch
store.dispatch({
  type: "rename-card",
  cardId: "card-1",
  title: "New title",
  transition: ["p1", "c1", "card-1", "rename-card"]
})
```

Both actions trigger the same derived computation, but each registers its async work under its own transition branch, preventing conflicts.

## Transition Requirements

### Explicit Transitions Required

**Async derived operations require explicit transitions.** The transition must be provided by the dispatch caller, not defined in the derived definition itself.

```typescript
// ❌ WRONG - No transition in derived definition
derived: d => [
  d.target($ => $.title)
    .getAsync(() => async () => { /* ... */ })
]

// ✅ CORRECT - Transition provided by dispatch caller
derived: d => [
  d.target($ => $.title)
    .getAsync(() => async () => { /* ... */ })
]

// Dispatch provides the transition
store.dispatch({
  type: "update-title",
  transition: ["page", "update-title"]
})
```

### Reserved Bootstrap Transition

The reserved `["bootstrap"]` transition is used internally for initial derived computation during store construction. Do not use this transition in your dispatch calls.

```typescript
// Store construction automatically uses ["bootstrap"] for initial derived run
const store = newSyberiaStore({
  derived: d => [/* ... */]
})(initialProps)

// Wait for initial computation
await store.awaitFor(["bootstrap"], 100)
```

### setState Restrictions

When async derived definitions exist, `setState` cannot be used directly because it has no transition:

```typescript
// ❌ Will throw if async derived exists
store.setState(prev => ({ ...prev, count: prev.count + 1 }))

// ✅ Use dispatch with transition instead
store.dispatch({
  type: "increment",
  transition: ["counter", "increment"]
})
```

## Transition Naming

Follow semantic naming patterns: `[entityId1, entityId2, ..., "actionName"]`

See the `transition-naming` skill for detailed naming guidelines.

## Usage Patterns

### Basic Dispatch with Transition

```typescript
const toggleTransition = ["p1", "c1", "card-1", "toggle-card"]

store.dispatch({
  type: "toggle-card",
  cardId: "card-1",
  transition: toggleTransition
})
```

### Checking Loading State

```typescript
// In React component
const isToggling = SyberiaCards.useTransition(toggleTransition)

if (isToggling) {
  return <div>Updating...</div>
}
```

### Waiting for Completion

```typescript
// In tests or async code
await store.awaitFor(toggleTransition, 100)
```

### Multiple Actions, Same Derived

When multiple actions trigger the same derived computation, check for any of their transitions:

```typescript
const toggleTransition = [pageId, columnId, cardId, "toggle-card"]
const renameTransition = [pageId, columnId, cardId, "rename-card"]

// Check if either action is in progress
const isUpdating = 
  useTransition(toggleTransition) || 
  useTransition(renameTransition)
```

## Examples

See [references/transition-examples.md](references/transition-examples.md) for comprehensive examples including:
- Card toggle and rename operations
- Async derived with multiple triggers
- Bootstrap transition usage
- React loading state patterns

## Key Principles

1. **Transitions are caller-owned**: The dispatch caller defines the transition, not the derived definition
2. **Explicit required**: Async derived operations must have a transition from the dispatch action
3. **Prevent conflicts**: Multiple actions can trigger the same derivation without conflicts
4. **Last write wins**: The transition that completes last writes the final derived value
5. **Semantic naming**: Transitions represent user intentions, not technical paths
