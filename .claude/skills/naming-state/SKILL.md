---
name: naming-state
description: React state naming conventions for differentiating UI modes from pending/ongoing operations. Use when naming local component state, deciding if a state belongs to transitions, or choosing between boolean and string mode state.
---

# Naming State (React)

## Core Rule

If a boolean state **starts with `is` + present-tense verb**, treat it as a pending/ongoing state and move it to transitions.

Examples: `isLoading`, `isSaving`, `isUpdating`, `isPending`, `isFetching`.

## UI Mode State

UI modes are **not pending operations**. Do not name UI modes with `is + verb`.

Preferred patterns:
- **Use a mode string**: `mode: "view" | "edit" | "preview"`
- **Or use a non-verb boolean**: `isEditMode`, `isUpdateMode`, `isRenameMode`

```typescript
const [mode, setMode] = useState<"view" | "edit">("view")
```

```typescript
const [isEditMode, setIsEditMode] = useState(false)
```

## Pending/Ongoing State (Transitions Only)

If the state means “something is in flight,” it must come from transitions, not local state.

```typescript
const isUpdating = Store.useTransition(["p1", "c1", "card-1", "rename-card"])
```

## Do / Don’t

### ✅ Do

```typescript
const [mode, setMode] = useState<"view" | "edit">("view")
const isUpdating = Store.useTransition(transition)
```

### ❌ Don’t

```typescript
const [isUpdating, setIsUpdating] = useState(false)
```

```typescript
const [isEditing, setIsEditing] = useState(false) // Use isEditMode or mode string
```
