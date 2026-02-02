---
name: react-ref-state-smell
description: Enforce a strict rule against using React refs to store state. Use when ref-based state is proposed or implemented. Requires explaining the use case to the prompter, asking permission to proceed, and checking for a better approach first. Refs for DOM attachment only (e.g., focus/measure), not for state.
---

# React Ref State Smell

## Core Rule

Using `useRef` to **track state** is a **HUGE code smell**.

If a ref is used to store or replace state, you **must stop** and go back to the prompter:

1. **Describe the use case clearly**
2. **Ask permission to implement**
3. **Ask if they have a better way to implement**

Do **not** proceed until you get approval.

## What Counts as Ref-Based State

If a ref is being used to hold values that should be part of React state, it is ref-based state:

```typescript
const titleRef = useRef("")
titleRef.current = newTitle
```

```typescript
const isEditingRef = useRef(false)
```

These are not allowed.

## Allowed Ref Usage (Not This Case)

Refs are allowed **only** for attaching to DOM elements or imperative handles:

```typescript
const inputRef = useRef<HTMLInputElement | null>(null)
inputRef.current?.focus()
```

Refs for tracking DOM elements do **not** count as state.

## Required Response When You See Ref-Based State

You must stop and ask:

> “I see `useRef` being used to store state. That’s a code smell.  
> The use case is: [describe].  
> Do you want me to proceed with this, or do you have a better approach?”

Only continue if the prompter explicitly approves.

## Preferred Alternatives

- Use `useState` for UI state
- Use store state for app state
- Use transitions for pending/ongoing state

## Quick Checklist

- Is the ref holding state that affects rendering? → **Stop and ask**
- Is the ref only attached to a DOM node for focus/measure? → **Allowed**
