# Pending State Examples

## Basic Pending UI

```typescript
const transition = ["user", userId, "profile", "update"]

store.dispatch({
  type: "update-profile",
  userId,
  transition,
})

const isPending = Profile.useTransition(transition)
```

## Disable UI During Pending

```tsx
const transition = ["p1", "c1", "card-1", "toggle-card"]
const isPending = Cards.useTransition(transition)

return (
  <Button disabled={isPending} onClick={handleToggle}>
    Toggle
  </Button>
)
```

## Multiple Transitions for the Same UI

```typescript
const toggleTransition = [pageId, columnId, cardId, "toggle-card"]
const renameTransition = [pageId, columnId, cardId, "rename-card"]

const isUpdating =
  Cards.useTransition(toggleTransition) ||
  Cards.useTransition(renameTransition)
```

## Bootstrap Pending State

```typescript
const isBootstrapping = Store.useTransition(["bootstrap"])

if (isBootstrapping) {
  return <Spinner />
}
```

## Testing Pending State

```typescript
const transition = ["p1", "c1", "card-1", "toggle-card"]
store.dispatch({ type: "toggle-card", cardId: "card-1", transition })

expect(store.transitions.isHappening(transition)).toBe(true)
await store.awaitFor(transition, 100)
expect(store.transitions.isHappening(transition)).toBe(false)
```
