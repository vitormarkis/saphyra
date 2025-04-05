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
  const descriptors = Object.getOwnPropertyDescriptors(source)
  Object.defineProperties(target, descriptors)
  return target
}
