import { exact } from "./fn/common"
import { Transition } from "./types"

export function isAbortError(error: unknown) {
  if (typeof error !== "object") return false
  if (!error) return false
  const _error = error as any
  if (_error.message === "Aborted!") return true
  if (_error.code === 20) return true
  if (_error.reason?.code === 20) return true
  return false
}

export function labelWhen(date: Date | number) {
  if (typeof date === "number") {
    date = new Date(date)
  }
  const isoString = date.toISOString()
  const [, minute, secondWithDot] = isoString.split("T")[1].split(":")
  const [second, milisecondWithZ] = secondWithDot.split(".")
  const milisecond = milisecondWithZ.slice(0, -1)
  return `${minute}m_${second}s_${milisecond}ms`
}

export function createAncestor<T>(head: any[]): T[][] {
  return head.reduce((acc, _, idx, arr) => {
    const items = arr.slice(0, ++idx)
    acc.push(items)
    return acc
  }, [])
}

export function readState(state: Record<string, any>) {
  const finalState: Record<string, any> = {}
  for (const key in state) {
    const value = state[key]
    const isFunction = typeof value === "function"
    if (isFunction) {
      finalState[key] = value()
    } else {
      finalState[key] = value
    }
  }
  return finalState
}

export function checkTransitionIsNested(transition: Transition) {
  const [lastSubject] = transition.toReversed()
  const isNested = lastSubject === "..." || lastSubject === "*"

  return isNested
    ? exact(["nested", transition.slice(0, -1)])
    : exact(["unique", transition])
}
