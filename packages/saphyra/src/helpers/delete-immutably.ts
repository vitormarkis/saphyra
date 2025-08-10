export function deleteImmutably<T extends Record<string, any>>(
  obj: T,
  key: string
) {
  const newObj = { ...obj }
  delete newObj[key]
  return newObj
}
