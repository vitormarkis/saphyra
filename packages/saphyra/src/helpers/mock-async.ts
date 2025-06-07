import { AsyncBuilder } from "../types"

export const mockAsync: () => AsyncBuilder = () => () => ({
  promise: () => ({
    onFinish: () => () => {},
  }),
  timer: () => {},
  setName: () => ({
    promise: () => ({
      onFinish: () => () => {},
    }),
    timer: () => {},
  }),
})
