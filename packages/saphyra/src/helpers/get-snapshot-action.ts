import { EventsTuple } from "~/event-emitter"
import type {
  ActionShape,
  ClassicAction,
  ClassicActionRedispatch,
} from "~/types"

export function getSnapshotAction<
  TState extends Record<string, any>,
  TEvents extends EventsTuple,
  TActions extends ClassicAction<TState, ActionShape, TEvents>,
>(action: TActions): ClassicActionRedispatch<TState, TActions, TEvents> {
  const { beforeDispatch: __, ...beforeDispatchAction } = action
  return beforeDispatchAction as ClassicActionRedispatch<
    TState,
    TActions,
    TEvents
  >
}
