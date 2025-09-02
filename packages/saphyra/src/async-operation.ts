import type { AsyncOperation } from "./types"
import { labelWhen } from "./utils"

export const newAsyncOperation = ({
  fn,
  label,
  type,
  when,
  fnUser,
}: Omit<AsyncOperation, "whenReadable">): AsyncOperation => {
  return {
    fn,
    label,
    type,
    when,
    whenReadable: labelWhen(when),
    fnUser,
  }
}
