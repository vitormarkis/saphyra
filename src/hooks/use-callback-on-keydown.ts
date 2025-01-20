import { useEffect } from "react"

export function useCallbackOnKeyDown(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: { key: string }) => {
      if (e.key === key) {
        callback()
      }
    }

    window.addEventListener("keydown", handler)

    return () => {
      window.removeEventListener("keydown", handler)
    }
  }, [])
}
