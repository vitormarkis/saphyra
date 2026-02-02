# Transition Examples

## Card Operations with Async Derived

A card's title is derived from `done` and `title` properties. Both toggle and rename actions trigger the same async derived computation.

### Store Definition

```typescript
const newSyberiaCardsStore = newSyberiaStore<State, State, Actions>({
  derived: d => [
    d
      .from(s => s.pages)
      .key(p => p.id)
      .each((page, d1) =>
        d1
          .from(() => page.columns)
          .key(c => c.id)
          .each((col, d2) =>
            d2
              .from(() => col.cards)
              .key(card => card.id)
              .each((card, d3) =>
                d3
                  .deps([
                    $ => $.pages[page].columns[col].cards[card].done,
                    $ => $.pages[page].columns[col].cards[card].title,
                  ])
                  .target($ => $.pages[page].columns[col].cards[card].title)
                  .getAsync((done, title) => async ({ signal }) => {
                    await sleep(300, `updating title`, signal)
                    return done
                      ? `[DONE] ${stripPrefix(title)}`
                      : `[TODO] ${stripPrefix(title)}`
                  })
              )
          )
      ),
  ],
  // ... reducer
})
```

### Dispatch with Transitions

```typescript
// Toggle action
const toggleTransition = ["p1", "c1", "card-1", "toggle-card"]
store.dispatch({
  type: "toggle-card",
  pageId: "p1",
  cardId: "card-1",
  transition: toggleTransition
})

// Rename action
const renameTransition = ["p1", "c1", "card-1", "rename-card"]
store.dispatch({
  type: "rename-card",
  pageId: "p1",
  cardId: "card-1",
  title: "New title",
  transition: renameTransition
})
```

### React Loading State

```typescript
function CardComponent({ card, pageId, columnId }) {
  const [store] = SyberiaCards.useStore()
  
  const toggleTransition = [pageId, columnId, card.id, "toggle-card"]
  const renameTransition = [pageId, columnId, card.id, "rename-card"]
  
  // Check if either action is updating the title
  const isUpdatingTitle =
    SyberiaCards.useTransition(toggleTransition) ||
    SyberiaCards.useTransition(renameTransition)
  
  return (
    <div>
      <span className={isUpdatingTitle ? "opacity-50" : ""}>
        {card.title}
        {isUpdatingTitle && " (updating...)"}
      </span>
      <button 
        disabled={isUpdatingTitle}
        onClick={() => store.dispatch({
          type: "toggle-card",
          pageId,
          cardId: card.id,
          transition: toggleTransition
        })}
      >
        Toggle
      </button>
    </div>
  )
}
```

## Bootstrap Transition

The bootstrap transition is used automatically during store construction for initial derived computation.

### Store Construction

```typescript
const store = newSyberiaStore({
  derived: d => [
    d.target($ => $.computed)
      .getAsync(() => async () => {
        // Initial computation runs under ["bootstrap"]
        return await fetchInitialData()
      })
  ]
})(initialProps)

// Wait for initial computation
await store.awaitFor(["bootstrap"], 100)
```

### Testing Bootstrap

```typescript
it("should compute initial derived values", async () => {
  const store = Store({ data: "initial" })
  
  // Wait for bootstrap to complete
  await store.awaitFor(["bootstrap"], 100)
  
  expect(store.getState().computed).toBeDefined()
})
```

## Multiple Cards, Independent Transitions

Each card has its own transition branch, allowing independent async operations.

```typescript
// Toggle first card
store.dispatch({
  type: "toggle-card",
  cardId: "card-1",
  transition: ["p1", "c1", "card-1", "toggle-card"]
})

// Toggle second card (independent transition)
store.dispatch({
  type: "toggle-card",
  cardId: "card-2",
  transition: ["p1", "c1", "card-2", "toggle-card"]
})

// Both transitions are tracked independently
expect(store.transitions.isHappening(["p1", "c1", "card-1", "toggle-card"])).toBe(true)
expect(store.transitions.isHappening(["p1", "c1", "card-2", "toggle-card"])).toBe(true)

// Wait for each independently
await Promise.all([
  store.awaitFor(["p1", "c1", "card-1", "toggle-card"], 100),
  store.awaitFor(["p1", "c1", "card-2", "toggle-card"], 100),
])
```

## Error Cases

### Missing Transition with Async Derived

```typescript
// ❌ Throws: "Actions must include a transition when async derived definitions exist"
store.dispatch({
  type: "toggle-card",
  cardId: "card-1"
  // Missing transition
})
```

### setState with Async Derived

```typescript
// ❌ Throws: "setState cannot be used when async derived definitions exist"
store.setState(prev => ({ ...prev, count: prev.count + 1 }))

// ✅ Use dispatch instead
store.dispatch({
  type: "increment",
  transition: ["counter", "increment"]
})
```

## Transition Lifecycle

1. **Dispatch with transition**: Action includes transition in dispatch call
2. **State update**: Reducer updates state synchronously
3. **Derived triggers**: Dependencies changed, derived computation starts
4. **Transition registered**: Async work registers under the action's transition
5. **Async computation**: Derived async function runs
6. **State updated**: Derived result updates state
7. **Transition cleared**: Transition marked as complete

```typescript
// 1. Dispatch
store.dispatch({
  type: "toggle-card",
  transition: toggleTransition
})

// 2-3. State updated, derived triggered
// Transition is now active
expect(store.transitions.isHappening(toggleTransition)).toBe(true)

// 4-6. Async computation runs
// (happens asynchronously)

// 7. Wait for completion
await store.awaitFor(toggleTransition, 100)

// Transition is now complete
expect(store.transitions.isHappening(toggleTransition)).toBe(false)
```
