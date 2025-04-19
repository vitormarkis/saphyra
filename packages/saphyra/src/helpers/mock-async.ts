import { Async } from "~/types"

export const mockAsync: () => Async<any, any> = () => ({
  promise() {
    return {
      onSuccess() {
        // debugger
      },
    }
  },
  timer() {
    // debugger
    return Math.random() as unknown as NodeJS.Timeout
  },
})
