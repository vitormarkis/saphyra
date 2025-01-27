export class Rollback {
  operations: Set<VoidFunction> = new Set()

  constructor() {}

  add(operation: VoidFunction) {
    this.operations.add(operation)
  }

  rollback() {
    this.operations.forEach(operation => operation())
    this.operations.clear()
    return new Rollback()
  }

  remove(operation: VoidFunction) {
    this.operations.delete(operation)
  }
}
