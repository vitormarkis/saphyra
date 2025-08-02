export function shallowCompare<T extends Record<string, any>>(
  objA: T | undefined,
  objB: T
) {
  if (objA === objB) return true

  if (
    objA === null ||
    objB === null ||
    typeof objA !== "object" ||
    typeof objB !== "object"
  ) {
    return false
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false
    for (let i = 0; i < objA.length; i++) {
      if (objA[i] !== objB[i]) return false
    }
    return true
  }

  if (!Array.isArray(objA) && !Array.isArray(objB)) {
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (objA[key] !== objB[key]) return false
    }
    return true
  }

  return false
}
