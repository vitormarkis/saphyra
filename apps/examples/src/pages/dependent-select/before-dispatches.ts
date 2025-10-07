import { BeforeDispatch } from "saphyra"

export const cancelPrevious: BeforeDispatch<any, any, any, any, any> = ({
  action,
  transition,
  store,
}) => {
  if (store.transitions.isHappeningUnique(transition)) {
    store.abort(transition)
  }
  return action
}

export const preventNextOne: BeforeDispatch<any, any, any, any, any> = ({
  action,
  transition,
  store,
}) => {
  if (store.transitions.isHappeningUnique(transition)) {
    return
  }
  return action
}
