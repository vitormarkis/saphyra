import { useRef, useEffect, useCallback } from "react"

export function useAbortController() {
  const controllerRef = useRef<AbortController>(new AbortController())

  useEffect(() => {
    return () => {
      controllerRef.current.abort()
    }
  }, [])

  const abort = useCallback(() => {
    controllerRef.current.abort()
    controllerRef.current = new AbortController()
  }, [])

  return {
    controller: controllerRef.current,
    abort,
  }
}
