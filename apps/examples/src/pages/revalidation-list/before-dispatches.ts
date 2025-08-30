import { BeforeDispatch } from "saphyra"

export const cancelPrevious: BeforeDispatch<any, any, any, any, any> = ({
  transitionStore,
  action,
  transition,
  store,
}) => {
  if (transitionStore.isHappeningUnique(transition)) {
    store.abort(transition)
  }
  return action
}

export const preventNextOne: BeforeDispatch<any, any, any, any, any> = ({
  transitionStore,
  action,
  transition,
  store,
}) => {
  if (transitionStore.isHappeningUnique(transition)) {
    return
  }
  return action
}
