import { Async } from "../types"

export const mockAsync: () => Async = () => ({
  promise() {
    return
  },
  timer() {
    return () => {}
  },
})
