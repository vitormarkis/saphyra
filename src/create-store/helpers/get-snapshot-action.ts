import { GenericAction } from "~/create-store/types"

export function getSnapshotAction<
  const T extends {
    type: string
  } & Record<string, any>
>(action: T): GenericAction {
  const { beforeDispatch: __, ...beforeDispatchAction } = action
  return beforeDispatchAction as GenericAction
}
