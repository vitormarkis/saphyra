// Internal utility functions for the waterfall component

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null
}

export function cn(
  ...classes: (string | undefined | null | boolean)[]
): string {
  return classes.filter(Boolean).join(" ")
}
