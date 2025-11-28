import { PromiseWithResolvers } from "~/polyfills/promise-with-resolvers"
import { SomeStoreGeneric, Transition } from "../types"

export type WaitForResult =
  | { success: true; reason: "completed" }
  | { success: false; reason: "timeout" }
  | { success: false; reason: "error"; error: unknown }

/**
 * Waits for a store transition to complete with proper cleanup and error handling.
 *
 * @param store - The store instance to monitor
 * @param transition - The transition to wait for (e.g., ["fetch", "users"])
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves with detailed result information
 *
 * @example
 * ```typescript
 * const result = await waitFor(store, ["fetch", "users"], 3000)
 *
 * if (result.success) {
 *   console.log("Transition completed successfully!")
 * } else if (result.reason === "timeout") {
 *   console.log("Transition timed out after 3 seconds")
 * } else if (result.reason === "error") {
 *   console.log("Transition failed with error:", result.error)
 * }
 * ```
 */
export function waitFor(
  store: SomeStoreGeneric,
  transition: Transition,
  timeout = 5000
): Promise<WaitForResult> {
  const resolver = PromiseWithResolvers<WaitForResult>()
  const transitionKey = transition.join(":")
  const transitionIsOngoing = store.transitions.isHappeningUnique(transition)
  if (!transitionIsOngoing) {
    const error = store.errors.state[transitionKey]
    if (error) {
      return Promise.resolve({ success: false, reason: "error", error })
    }
    return Promise.resolve({ success: true, reason: "completed" })
  }

  let isResolved = false

  const timeoutId = setTimeout(() => {
    if (!isResolved) {
      isResolved = true
      cleanupEventListeners()
      resolver.resolve({ success: false, reason: "timeout" })
    }
  }, timeout)

  const cleanupSuccess = store.transitions.events.done
    .once(transitionKey)
    .run(() => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeoutId)
        cleanupEventListeners()
        resolver.resolve({ success: true, reason: "completed" })
      }
    })

  const cleanupError = store.transitions.events.error
    .once(transitionKey)
    .run((error: unknown) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeoutId)
        cleanupEventListeners()
        resolver.resolve({ success: false, reason: "error", error })
      }
    })

  function cleanupEventListeners() {
    cleanupSuccess()
    cleanupError()
  }

  return resolver.promise
}

export function waitForBootstrap(store: SomeStoreGeneric, timeout = 5000) {
  return waitFor(store, ["bootstrap"], timeout)
}
