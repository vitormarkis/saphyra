import { EventsTuple } from "~/event-emitter"
import type {
  ActionRedispatch,
  ActionShape,
  BaseAction,
  ClassicAction,
  ClassicActionRedispatch,
} from "~/types"

export function getSnapshotAction<
  TState extends Record<string, any>,
  TEvents extends EventsTuple,
  TActions extends ClassicAction<TState, ActionShape<TState, TEvents>, TEvents>,
>(action: TActions): ClassicActionRedispatch<TState, TActions, TEvents> {
  const { beforeDispatch: __, ...beforeDispatchAction } = action
  return beforeDispatchAction as ClassicActionRedispatch<
    TState,
    TActions,
    TEvents
  >
}
