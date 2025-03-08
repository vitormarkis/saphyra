import { BaseAction, GenericAction } from "~/create-store/types"

export function getSnapshotAction<
  TState extends Record<string, any>,
  TActions extends BaseAction<TState>,
>(action: TActions): GenericAction {
  const { beforeDispatch: __, ...beforeDispatchAction } = action
  return beforeDispatchAction as TActions
}
