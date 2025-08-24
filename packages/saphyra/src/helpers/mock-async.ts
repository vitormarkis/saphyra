import { AsyncBuilder } from "../types"

export const mockAsync: () => AsyncBuilder = () => () => ({
  promise: () => {},
  setTimeout: () => {},
  setName: _name => ({
    onFinish: _props => ({
      promise: () => {},
      setTimeout: () => {},
    }),
    promise: () => {},
    setTimeout: () => {},
  }),
  onFinish: _props => ({
    promise: () => {},
    setTimeout: () => {},
  }),
})
