export function isNewActionError(error: unknown) {
  if (typeof error !== "object") return false
  if (!error) return false
  const _error = error as any
  if (_error.message === "Aborted!") return true
  if (_error.code === 20) return true
  if (_error.reason?.code === 20) return true
  return false
}

export function labelWhen(date: Date) {
  const isoString = date.toISOString()
  const [_hour, minute, secondWithDot] = isoString.split("T")[1].split(":")
  const [second, milisecondWithZ] = secondWithDot.split(".")
  const milisecond = milisecondWithZ.slice(0, -1)
  return `${minute}m_${second}s_${milisecond}ms`
}
