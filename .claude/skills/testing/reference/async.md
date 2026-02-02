# Async Operations Reference

## Overview

This reference covers async operations in Syberia stores, including async derived computations, transitions, and async testing utilities.

## Async Derived Computations

### Using `getAsync`

Async derived values use `getAsync` instead of `get`:

```typescript
derived: d => [
  d
    .deps([s => s.query])
    .target(s => s.$results)
    .getAsync((query) => async ({ signal, current }) => {
      const result = await fetchData(query, { signal })
      return result
    })
]
```

### Handler Signature

The `getAsync` handler receives dependencies and returns an async function:

```typescript
.getAsync((...deps) => async (ctx) => {
  // ctx.signal: AbortSignal for cancellation
  // ctx.current: current value at target path (for patching)
  return newValue
})
```

### Context Object

The async context provides:

- `signal: AbortSignal` - For cancellation support
- `current?: any` - Current value at target path (useful for patching)

## Transitions

### What are Transitions?

Transitions track async work in the store. Each async operation is associated with a transition name.

### Transition Naming

Follow semantic naming patterns: `[entityId1, entityId2, ..., "actionName"]`

```typescript
const transition = ["p1", "c1", "card-1", "toggle-card"]
```

See `transition-naming` skill for detailed patterns.

### Auto-Generated Transitions

For async derived computations, transitions are automatically generated from the target path:

```typescript
// Target: $.pages[page].columns[col].cards[card].title
// Transition: ["pages", "id=p1", "columns", "id=c1", "cards", "id=card-1", "title"]
```

### Manual Transitions

You can specify transitions in dispatch actions:

```typescript
store.dispatch({
  type: "toggle-card",
  cardId: "card-1",
  transition: ["p1", "c1", "card-1", "toggle-card"]
})
```

## Async Testing Utilities

### `store.awaitFor(transition, timeout?)`

Waits for a transition to complete:

```typescript
await store.awaitFor(transition, 100) // timeout defaults to 5000ms
```

- Resolves immediately if transition is not happening
- Rejects with timeout error if transition doesn't complete within timeout
- Automatically cleans up subscriptions

### `store.transitions.isHappening(transition)`

Checks if a transition is currently active:

```typescript
expect(store.transitions.isHappening(transition)).toBe(true)
```

### `store.transitions.getItems(transition)`

Gets all active work items for a transition:

```typescript
const items = store.transitions.getItems(transition)
expect(items.length).toBeGreaterThan(0)
```

## Async Operation Lifecycle

1. **Dependency Change**: When dependencies of an async derived value change
2. **Transition Starts**: Transition is marked as happening
3. **Async Function Runs**: The async handler executes
4. **State Updates**: When async completes, state is updated
5. **Transition Ends**: Transition is marked as complete

## Cancellation

Async operations can be cancelled via `AbortSignal`:

```typescript
.getAsync((query) => async ({ signal }) => {
  const response = await fetch(`/api?q=${query}`, { signal })
  if (signal.aborted) {
    throw new Error("Cancelled")
  }
  return response.json()
})
```

## Error Handling

If an async operation throws an error:
- The transition is marked as complete
- The error is not automatically caught (handle in your async function)
- State is not updated (previous value remains)

## Best Practices

1. **Always use semantic transition names** for manual transitions
2. **Handle cancellation** in long-running async operations
3. **Use appropriate timeouts** in tests (short for fast tests, longer for real operations)
4. **Assert transitions are happening** before awaiting them
5. **Test async behavior** by asserting values haven't changed immediately after dispatch

## Examples

### Basic Async Derived

```typescript
derived: d => [
  d
    .deps([s => s.userId])
    .target(s => s.$userProfile)
    .getAsync((userId) => async ({ signal }) => {
      return await fetchUserProfile(userId, { signal })
    })
]
```

### Async with Current Value

```typescript
derived: d => [
  d
    .deps([s => s.items])
    .target(s => s.$filteredItems)
    .getAsync((items) => async ({ signal, current }) => {
      // Use current for incremental updates
      const newItems = await filterItems(items, { signal })
      return current ? [...current, ...newItems] : newItems
    })
]
```

### Nested Async Derived

```typescript
derived: d => [
  d
    .from(s => s.pages)
    .key(p => p.id)
    .each((page, d1) =>
      d1
        .from(() => page.cards)
        .key(card => card.id)
        .each((card, d2) =>
          d2
            .deps([$ => $.pages[page].cards[card].query])
            .target($ => $.pages[page].cards[card].$results)
            .getAsync((query) => async ({ signal }) => {
              return await search(query, { signal })
            })
        )
    )
]
```
