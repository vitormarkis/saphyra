import { AsyncBuilder } from "../types"

export const mockAsync: () => AsyncBuilder = () => () => ({
  promise: () => {},
  timer: () => {},
  setName: name => ({
    onFinish: props => ({
      promise: () => {},
      timer: () => {},
    }),
    promise: () => {},
    timer: () => {},
  }),
  onFinish: props => ({
    promise: () => {},
    timer: () => {},
  }),
})
