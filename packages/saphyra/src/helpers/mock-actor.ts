import { mockAsync } from "./mock-async"

export const mockActor = () => ({
  set() {
    debugger
  },
  dispatch() {
    debugger
  },
  async: mockAsync(),
})
