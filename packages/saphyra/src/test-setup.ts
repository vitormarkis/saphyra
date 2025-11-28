import { beforeAll } from "vitest"

// Suppress unhandled rejection warnings for InfiniteLoopError
// These errors are intentionally thrown in tests and are caught by the store's error handling
beforeAll(() => {
  const originalListeners = process.listeners("unhandledRejection")
  process.removeAllListeners("unhandledRejection")

  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    if (
      reason &&
      typeof reason === "object" &&
      "name" in reason &&
      (reason as { name: string }).name === "InfiniteLoopError"
    ) {
      // Suppress InfiniteLoopError - it's expected in infinite loop tests
      return
    }
    // Call original listeners for other errors
    originalListeners.forEach(listener => listener(reason, promise))
  })
})

