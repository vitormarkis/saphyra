---
name: testing
description: Testing patterns for Syberia stores. Use when writing tests for store actions, state updates, derived values, or async operations. Covers sync and async testing patterns, assertions, and best practices.
---

# Testing Patterns

## General Testing Structure

Every store test follows a consistent structure:

1. **Arrange**: Set up the store and initial state
2. **Act**: Dispatch actions or trigger state changes
3. **Assert**: Verify expected outcomes

```typescript
// Arrange
const store = Store({ /* initial state */ })

// Act
store.dispatch({ type: "action-name", payload })

// Assert
expect(store.getState().value).toBe(expectedValue)
```

## Sync Testing Pattern

For synchronous operations, assert immediately after dispatch:

```typescript
// Initial state
expect(store.getState().count).toBe(0)

// Dispatch and assert
store.dispatch({ type: "increment" })
expect(store.getState().count).toBe(1)

store.dispatch({ type: "increment" })
expect(store.getState().count).toBe(2)
```

## Async Testing Pattern

For async operations, the critical pattern is **assert before await**.

**Always assert that async-derived values haven't changed immediately after dispatch.** This proves async operations are truly asynchronous.

```typescript
// 1. Assert initial state
expect(store.getState().card.title).toBe("[TODO] Pay bills")

// 2. Dispatch action
store.dispatch({ type: "toggle-card", cardId: "card-1" })

// 3. CRITICAL: Assert async value hasn't changed yet
expect(store.getState().card.done).toBe(true) // ✅ State changed synchronously
expect(store.getState().card.title).toBe("[TODO] Pay bills") // ✅ Async value still old

// 4. Assert transition is happening
expect(store.transitions.isHappening(transition)).toBe(true)

// 5. Await the async operation
await store.awaitFor(transition, 100)

// 6. Assert final state
expect(store.getState().card.title).toBe("[DONE] Pay bills") // ✅ Async value updated
```

### Why Assert Before Await?

Without immediate assertion, tests pass even if async runs synchronously:

```typescript
// ❌ Bad: Doesn't verify async behavior
store.dispatch({ type: "toggle-card" })
await store.awaitFor(transition, 100)
expect(store.getState().card.title).toBe("[DONE] Pay bills")

// ✅ Good: Verifies async behavior
store.dispatch({ type: "toggle-card" })
expect(store.getState().card.title).toBe("[TODO] Pay bills") // Old value proves async
await store.awaitFor(transition, 100)
expect(store.getState().card.title).toBe("[DONE] Pay bills")
```

## Derived Values Testing

### Sync Derived

Sync derived values update immediately:

```typescript
// Dispatch changes dependency
store.dispatch({ type: "toggle-card", cardId: "card-1" })

// Derived value is already updated
expect(store.getState().card.title).toBe("[DONE] Pay bills")
```

### Async Derived

Async derived values require awaiting:

```typescript
store.dispatch({ type: "toggle-card", cardId: "card-1" })

// Derived value NOT yet updated
expect(store.getState().card.title).toBe("[TODO] Pay bills")

await store.awaitFor(transition, 100)

// Now it's updated
expect(store.getState().card.title).toBe("[DONE] Pay bills")
```

## Transitions Testing

### Verify Transition is Active

```typescript
store.dispatch({ type: "action", transition: ["entity-id", "action-name"] })
expect(store.transitions.isHappening(transition)).toBe(true)
```

### Wait for Transition Completion

```typescript
await store.awaitFor(transition, 100) // timeout in ms
expect(store.transitions.isHappening(transition)).toBe(false)
```

## Testing Checklist

### Sync Tests
- [ ] Assert initial state
- [ ] Dispatch action
- [ ] Assert final state immediately

### Async Tests
- [ ] Assert initial state
- [ ] Dispatch action
- [ ] **Assert async values haven't changed** (critical)
- [ ] Assert transition is happening
- [ ] Await transition completion
- [ ] Assert final state

## Common Mistakes

### ❌ Missing Immediate Assertion (Async)

```typescript
store.dispatch({ type: "toggle-card" })
await store.awaitFor(transition, 100)
expect(store.getState().card.title).toBe("[DONE] Pay bills")
// Missing: Assertion that title hasn't changed yet
```

### ❌ Awaiting Sync Operations

```typescript
store.dispatch({ type: "increment" })
await store.awaitFor(transition, 100) // Unnecessary for sync
expect(store.getState().count).toBe(1)
```

## Additional Resources

- For async operations API and details, see [reference/async.md](reference/async.md)
- For transition naming patterns, see `transition-naming` skill
