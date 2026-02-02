---
name: syberia-pending-states
description: Guidance for handling pending/ongoing/loading states in Syberia. Use when showing loading UI, disabling interactions, or tracking async work. Never track pending state manually; always rely on store transitions provided by dispatch callers.
---

# Syberia Pending States

## Core Rule

When dealing with ongoing/pending/loading states, **never keep track of it manually**. Always rely on store transitions.

Pending state is derived from transitions, not `useState` flags or ad-hoc booleans.

## Naming Signal for Pending State

If a boolean state **starts with `is` + present-tense verb** (e.g. `isLoading`, `isSaving`, `isPending`, `isHappening`), treat it as a pending/ongoing state and move it to transitions.

This rule is used to decide whether a boolean belongs to transitions or local UI state.

## Why This Matters

Async derived computations can be triggered by multiple actions. Transitions provide **caller-owned branches** for tracking which operation is in flight. Manual flags become incorrect when actions overlap.

## Required Pattern

1. **Dispatch actions with explicit transitions**
2. **Derive pending state from `store.transitions` or `useTransition`**
3. **Use that derived pending state for UI**

```typescript
const toggleTransition = ["p1", "c1", "card-1", "toggle-card"]

store.dispatch({
  type: "toggle-card",
  cardId: "card-1",
  transition: toggleTransition,
})

const isToggling = Store.useTransition(toggleTransition)
```

## Do / Don't

### ✅ Do

```typescript
const isPending = Store.useTransition(["p1", "c1", "card-1", "toggle-card"])
```

```typescript
await store.awaitFor(["p1", "c1", "card-1", "toggle-card"], 100)
```

### ❌ Don't

```typescript
const [isPending, setIsPending] = useState(false)
```

```typescript
setIsPending(true)
await doAsyncWork()
setIsPending(false)
```

## Multiple Actions Triggering the Same Derived Computation

If multiple actions can trigger the same async derived computation, check all relevant transitions:

```typescript
const toggleTransition = [pageId, columnId, cardId, "toggle-card"]
const renameTransition = [pageId, columnId, cardId, "rename-card"]

const isUpdating =
  Store.useTransition(toggleTransition) ||
  Store.useTransition(renameTransition)
```

## Bootstrap Pending State

Initial derived computations run under the reserved `["bootstrap"]` transition. Use it to detect initial loading:

```typescript
const isBootstrapping = Store.useTransition(["bootstrap"])
```

## References

See [references/pending-state-examples.md](references/pending-state-examples.md) for complete examples.
