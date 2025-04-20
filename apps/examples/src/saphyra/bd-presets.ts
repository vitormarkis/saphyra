import { BeforeDispatch } from "saphyra"

export const debounce =
  (ms = 500): BeforeDispatch =>
  ({ transition, abort, createAsync, redispatch }) => {
    abort(transition)
    const async = createAsync()
    async.timer(() => redispatch(), ms)
  }

export const cancelPrevious =
  (): BeforeDispatch =>
  ({ action, transition, abort }) => {
    abort(transition)
    return action
  }
