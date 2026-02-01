---
name: typescript-error-fixing
description: Guide for fixing TypeScript errors with focus on maximizing developer experience through type inference. Use when fixing TypeScript errors, resolving type mismatches, improving type definitions, or when encountering `any` types in callbacks or function arguments.
---

# TypeScript Error Fixing

Fix TypeScript errors by prioritizing inference over casting and maximizing developer experience.

## Core Principles

### 1. Inference Over Casting - Always

**Never** choose user casting (`as Type`, `!`, `as any`) over proper type inference from definitions.

```typescript
// BAD - User must cast, loses type safety
const result = store.get("user") as User;

// GOOD - Type flows from definition
const result = store.get("user"); // already typed as User
```

When a fix requires casting, the **definition is wrong** - fix the source, not the consumption site.

### 2. Maximize Developer Experience

The best TypeScript code requires:
- **Minimal manual work** - Types flow automatically
- **Zero mental overhead** - Autocomplete guides the developer
- **Errors on schema changes** - Breaking changes surface at compile time

Prioritize this hierarchy:
1. Full inference from source definitions
2. Generic constraints that preserve types
3. Explicit types only when inference is impossible

### 3. Callbacks Must Never Have `any`

Callback arguments are the user's interface back into your system. `any` in callbacks means **failed inference**.

```typescript
// BAD - User gets no autocomplete, no safety
store.subscribe((state: any) => { ... });

// GOOD - Full type information flows to callback
store.subscribe((state) => { ... }); // state is fully typed
```

When you see `any` in a callback parameter, trace back to find where inference broke.

### 4. Propose API Changes When Beneficial

If the current API makes proper inference impossible or overly complex, **propose an alternative API** that enables better TypeScript DX.

Example triggers:
- Generic parameters that can't be inferred
- Required type annotations at call sites
- Loss of literal types through the call chain

## Fixing Process

### Step 1: Identify the Root Cause

Don't fix the symptom. Trace the error to its origin:

```
Error at consumption site → Check function return type → Check generic inference → Check source definition
```

### Step 2: Fix at the Earliest Point

Fix where types are **defined**, not where they're **consumed**:

| Location | Priority |
|----------|----------|
| Type definition / interface | Highest |
| Generic constraints | High |
| Function signatures | Medium |
| Call site annotations | Low (avoid) |
| Type assertions / casting | Last resort |

### Step 3: Verify Inference Flows

After fixing, verify the entire chain infers correctly:
1. Hover over variables - should show specific types, not `any`
2. Check callback parameters - should be fully typed
3. Test autocomplete - should suggest valid members
4. Change a source type - errors should propagate to all consumers

## Common Patterns

### Preserving Literal Types

```typescript
// BAD - Widens to string
function createAction(type: string) { ... }
createAction("INCREMENT"); // type is string

// GOOD - Preserves literal
function createAction<T extends string>(type: T) { ... }
createAction("INCREMENT"); // type is "INCREMENT"
```

### Generic Inference from Arguments

```typescript
// BAD - Requires manual type parameter
function wrap<T>(value: T): Wrapper<T>;
wrap<User>(user); // User must specify <User>

// GOOD - Infers from argument
function wrap<T>(value: T): Wrapper<T>;
wrap(user); // T inferred as User from argument
```

### Callback Type Inference

```typescript
// BAD - Callback loses context
type Handler = (data: any) => void;

// GOOD - Generic preserves type
type Handler<T> = (data: T) => void;

// BEST - Infer from registration
function on<K extends keyof Events>(
  event: K,
  handler: (data: Events[K]) => void
) { ... }
```

### Mapped Types for Schema Changes

```typescript
// Ensures errors propagate when schema changes
type Actions = {
  [K in keyof Schema]: {
    type: K;
    payload: Schema[K];
  };
}[keyof Schema];
```

## Red Flags

Watch for these anti-patterns:

| Anti-pattern | Problem | Solution |
|--------------|---------|----------|
| `as Type` at call sites | Bypasses type checking | Fix return type inference |
| `any` in callbacks | User loses type safety | Add generics to preserve types |
| Manual generic parameters | Extra work for user | Infer from arguments |
| Type widening (`string` from literal) | Loses precision | Use `const` assertions or generic constraints |
| `// @ts-ignore` | Hides real issues | Fix the underlying type |

## When to Propose API Changes

Propose changes when:
1. Current API **requires** type assertions
2. Inference chain breaks and can't be fixed without API change
3. Simpler API would provide same functionality with better types
4. Generic parameters can't be inferred from usage

Frame proposals as: "The current API requires X. If we change to Y, the types will flow automatically and users get Z benefit."
