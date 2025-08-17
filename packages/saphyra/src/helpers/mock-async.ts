import { AsyncBuilder } from "../types"

export const mockAsync: () => AsyncBuilder = () => () => ({
  promise: () => {},
  timer: () => {},
  setName: _name => ({
    onFinish: _props => ({
      promise: () => {},
      timer: () => {},
    }),
    promise: () => {},
    timer: () => {},
  }),
  onFinish: _props => ({
    promise: () => {},
    timer: () => {},
  }),
})
