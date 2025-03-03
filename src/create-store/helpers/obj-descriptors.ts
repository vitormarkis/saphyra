export function cloneObj<T>(obj: T): T {
  return Object.create(
    Object.getPrototypeOf(obj),
    Object.getOwnPropertyDescriptors(obj)
  )
}

export function mergeObj<T, R = T>(target: T, ...sources: any[]): R {
  return Object.defineProperties(Object.create(Object.getPrototypeOf(target)), {
    ...Object.getOwnPropertyDescriptors(target),
    ...sources.reduce(
      (acc, source) => ({
        ...acc,
        ...Object.getOwnPropertyDescriptors(source),
      }),
      {}
    ),
  })
}

export function assignObjValues(target: any, source: any) {
  // Retrieve all property descriptors (including getters and setters)
  const descriptors = Object.getOwnPropertyDescriptors(source)

  // Define those descriptors on the target object
  Object.defineProperties(target, descriptors)

  // Return the mutated target for convenience
  return target
}
