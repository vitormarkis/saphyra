---
name: transition-naming
description: Guide for creating semantic transition names in Syberia stores. Use when specifying transitions in dispatch actions, derived computations, or when working with async operations that need transition tracking. Transitions should be unique based on user intention and follow a hierarchical pattern with entity IDs and action names.
---

# Transition Naming Patterns

## Core Principle

Transition names should be **unique based on user intention**, not just technical paths. They represent what the user is doing, not where data is stored.

## Pattern Structure

Transitions follow a hierarchical pattern: `[entityId1, entityId2, ..., "actionName"]`

- **Entity IDs**: The IDs of entities involved in the operation (page, column, card, etc.)
- **Action name**: The specific action being performed (kebab-case string)

## Examples

### Card Operations

```typescript
// Toggle a card's done state
const transition = ["p1", "c1", "card-1", "toggle-card"]
store.dispatch({ type: "toggle-card", cardId: "card-1", transition })

// Update a card's title
const transition = ["p1", "c1", "card-1", "update-title"]
store.dispatch({ type: "update-title", cardId: "card-1", transition })
```

### Board Operations

```typescript
// Toggle a todo in a board
const transition = [boardId, columnId, todoId, "toggle"]
store.dispatch({ type: "toggle-todo", todoId, transition })

// Update user profile
const transition = [userId, "profile", "update"]
store.dispatch({ type: "update-profile", userId, transition })
```

## Key Guidelines

1. **Use entity IDs, not paths**: `["p1", "c1", "card-1", "toggle-card"]` not `["pages", "id=p1", "columns", "id=c1", "cards", "id=card-1", "title"]`

2. **End with action name**: Always end the transition array with the specific action being performed (e.g., `"toggle-card"`, `"update-title"`)

3. **Follow containment hierarchy**: Left contains right, right is contained by left neighbor
   - `[pageId, columnId, cardId, "action"]` - page contains column, column contains card

4. **Use kebab-case for action names**: `"toggle-card"`, `"update-title"`, `"delete-item"`

5. **Keep it semantic**: The transition should describe what the user is doing, not technical implementation details

## Derived Computations

For async derived computations, transitions are currently auto-generated from target paths. When manually specifying transitions in dispatch actions, use the semantic pattern above.

## Usage in Tests

When testing async operations:

```typescript
// Define semantic transition
const toggleTransition = ["p1", "c1", "card-1", "toggle-card"]

// Dispatch with transition
store.dispatch({ type: "toggle-card", cardId: "card-1", transition: toggleTransition })

// Wait for completion
await store.awaitFor(toggleTransition, 100)
```
