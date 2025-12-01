import { AsyncBuilder } from "../types"

export const mockAsync: () => AsyncBuilder = () => () => ({
  promise: () => {},
  setTimeout: () => {},
  setName: _name => ({
    onFinish: _props => ({
      promise: () => {},
      setTimeout: () => {},
    }),
    queue: _id => ({
      promise: () => {},
      setTimeout: () => {},
      onFinish: _props => ({
        promise: () => {},
        setTimeout: () => {},
      }),
    }),
    promise: () => {},
    setTimeout: () => {},
  }),
  queue: _id => ({
    promise: () => {},
    setTimeout: () => {},
    onFinish: _props => ({
      promise: () => {},
      setTimeout: () => {},
    }),
  }),
  onFinish: _props => ({
    promise: () => {},
    setTimeout: () => {},
  }),
})
