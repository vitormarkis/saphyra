# OnFinish Queue Abort Issue

## Problem Description

When a queued operation fails and aborts the remaining queue items, the `onFinish` callbacks that were waiting for the "last" operation to trigger their revalidation are left hanging indefinitely.

## Root Cause Analysis

### Normal Flow
1. Multiple operations with `onFinish` callbacks get queued
2. Each `onFinish` checks `isLast()` - only the LAST one calls `dispatchAsync(["revalidate"])`
3. All other operations' onFinish callbacks hang, waiting for that revalidate transition to complete
4. When the last operation completes, it dispatches the revalidate, which resolves ALL hanging onFinish callbacks

### The Bug - When Queue Fails
1. `["fail"]` operation throws an error
2. Queue aborts remaining items (e.g., `["mutate"]`)
3. `["mutate"]` would have been the "last" one that triggers the revalidate
4. But since `["mutate"]` never runs, it never calls `dispatchAsync(["revalidate"])`
5. The `["revalidate"]` transition from the FIRST operation's onFinish is left **hanging forever**
6. This leaves garbage in the store:
   - ❌ `finishes = {revalidate: 1}` - still 1 hanging onFinish waiting
   - ❌ `subtransitions = {$onFinish-revalidate: 1}` - onFinish subtransition still active
   - ❌ `controllers` - still contains "revalidate"
   - ❌ `transitionsState.state` - still contains "revalidate"

## Evidence from Debugger

```
transitions = TransitionsStore {
  state = {
    transitions: {},  // ✅ empty (good!)
    finishes: {revalidate: 1},  // ❌ hanging onFinish
    subtransitions: {
      $queue:data: 0,
      $onFinish-revalidate: 1  // ❌ hanging subtransition
    }
  }
}
```

## Solution Attempts

### Attempt 1: Call cleanup functions and doneFinish
```typescript
if (onFinishId) {
  const finishCleanUpList = store.transitions.finishCallbacks.cleanUps[onFinishId]
  finishCleanUpList?.forEach(cleanUp => (cleanUp as any)(trans))
  store.transitions.doneFinish(onFinishId)
}
```
**Status**: Partial success - test no longer times out indefinitely, but still fails assertion

### Attempt 2: Additionally call store.abort() directly
```typescript
if (onFinishId) {
  finishCleanUpList?.forEach(cleanUp => (cleanUp as any)(trans))
  store.transitions.doneFinish(onFinishId)
  
  const onFinishTransition = Array.isArray(onFinish?.id) ? onFinish.id : [onFinishId]
  if (store.transitions.isHappeningUnique(onFinishTransition)) {
    store.abort(onFinishTransition)
  }
}
```
**Status**: Test times out again - `isHappeningUnique()` may be returning false

## Current Investigation

Need to determine:
1. Does `beforeDispatch` returning `undefined` cancel the dispatch or proceed?
2. Is the ["revalidate"] transition actually running when we try to abort it?
3. Why is `isHappeningUnique(["revalidate"])` returning false?
4. Is the revalidate async operation completing before we try to abort?

## Key Questions

1. When `beforeDispatch({ action, transition })` returns `undefined` (not returning `action`), does the dispatch proceed or get cancelled?
2. The test's revalidate action runs `async().promise()` with 30ms timeout - is this completing before the 50ms timeout of the fail operation?
3. Should we abort the transition synchronously before calling doneFinish, or after?

### Key Components Involved

1. **`createRunOnFinishCallback()`** (createAsync.ts:605-693)
   - Creates the `PromiseWithResolvers` that hangs
   - Wraps the promise waiting for revalidate dispatch

2. **`store.transitions.finishCallbacks.cleanUps`**
   - Stores cleanup functions for onFinish callbacks
   - Should be invoked when queue aborts

3. **`store.transitions.addFinish()` / `doneFinish()`**
   - Manages the `finishes` counter
   - Needs to be called even when queue aborts

## Test Case

Test: `"on finish api + queue + action yet to fail should clears the queue - should clean up properly"`

This test verifies that when:
- `["fail"]` operation fails
- `["mutate"]` operation is aborted from queue
- All transitions properly clean up, including the hanging `["revalidate"]` from onFinish

## Related Files

- `packages/saphyra/src/createAsync.ts` - Main implementation location
- `packages/saphyra/src/queue-manager.ts` - Where `failRemainingQueue()` is called
- `packages/saphyra/src/transitions-store.ts` - Manages finishes, subtransitions
- `packages/saphyra/src/store.queue.test.ts` - Test case

