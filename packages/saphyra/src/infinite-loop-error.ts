export class InfiniteLoopError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InfiniteLoopError"
  }
}
