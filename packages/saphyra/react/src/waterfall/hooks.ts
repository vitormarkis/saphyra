import { useEffect } from "react"

type OnPositionProps = {
  x: number
  y: number
}

type UseMouseOptions = {
  onPosition?: (props: OnPositionProps) => void
}

export function useMouse(options: UseMouseOptions = {}) {
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      options.onPosition?.({ x: e.clientX, y: e.clientY })
    }
    document.addEventListener("mousemove", handle)
    return () => {
      document.removeEventListener("mousemove", handle)
    }
  }, [options.onPosition])
}
