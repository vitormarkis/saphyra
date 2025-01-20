import { EventsTuple } from "~/create-store/event-emitter"
import {
  Async,
  AsyncActor,
  BaseAction,
  BaseState,
  DefaultActions,
  Dispatch,
  isSetter,
  SomeStore,
} from "./types"
import { noop } from "~/create-store/fn/noop"

export const errorNoTransition = () => new Error("No transition provided.")

/**
 * Comportamento deve ser mudado no futuro caso a store comece a
 * dar suporte a subtransitions dentro de transitions
 */
function createTransitionDispatch<
  TState,
  TActions extends BaseAction<TState>,
  TEvents extends EventsTuple
>(
  store: SomeStore<TState, TActions, TEvents>,
  transition: any[] | null | undefined
): Dispatch<TState, TActions> {
  return function dispatch(action: TActions) {
    store.dispatch({
      ...action,
      transition,
    })
  }
}

export function createAsync<
  TState = BaseState,
  TActions extends BaseAction<TState> = DefaultActions & BaseAction<TState>,
  TEvents extends EventsTuple = EventsTuple
>(
  store: SomeStore<TState, TActions, TEvents>,
  state: TState,
  transition: any[] | null | undefined
): Async<TState, TActions> {
  type AsyncInner = Async<TState, TActions>
  type AsyncActorInner = AsyncActor<TState, TActions>
  const dispatch: AsyncActorInner["dispatch"] = createTransitionDispatch(store, transition)
  const set: AsyncActorInner["set"] = setter => {
    store.registerSet(
      (currentState: TState) => {
        const newState = isSetter(setter) ? setter(currentState) : setter
        return { ...currentState, ...newState }
      },
      state,
      transition,
      "reducer"
    )
  }
  const promise: AsyncInner["promise"] = <T>(
    promise: Promise<T>,
    onSuccess?: (value: T, actor: AsyncActor<TState, TActions>) => void
  ) => {
    if (!transition) throw errorNoTransition()
    store.transitions.addKey(transition)

    async function handlePromise(promise: Promise<T>) {
      if (!transition) throw errorNoTransition()
      const async = createAsync(store, state, transition)
      try {
        if (!transition) throw errorNoTransition()
        const value = await promise
        onSuccess ??= noop
        onSuccess(value, {
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(transition, null)
      } catch (error) {
        store.transitions.doneKey(transition, error)
      }
    }
    handlePromise(promise)
  }

  const timer = (callback: (actor: AsyncActor<TState, TActions>) => void, time = 0) => {
    if (!transition) throw errorNoTransition()
    const async = createAsync(store, state, transition)
    store.transitions.addKey(transition)
    setTimeout(() => {
      try {
        callback({
          dispatch,
          set,
          async,
        })
        store.transitions.doneKey(transition, null)
      } catch (error) {
        console.log(
          "%cSomething went wrong! Rolling back the store state. [TODO]",
          "color: palevioletred"
        )
        store.transitions.doneKey(transition, error)
      }
    }, time)
  }

  return {
    promise,
    timer,
  }
}
