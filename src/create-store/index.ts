import { Subject } from "../Subject"
import { BaseAction, DefaultActions, GenericStore, GenericStoreClass, TODO } from "./types"

/**
 * On construct
 */
type OnConstructProps<TInitialProps, TState, TAction> = {
  initialProps: TInitialProps
  store: GenericStore<TState, TAction> & Record<string, any>
}

type OnConstruct<TInitialProps, TState = TInitialProps, TActions = DefaultActions> = (
  props: OnConstructProps<TInitialProps, TState, TActions>
) => TState

function defaultOnConstruct<TInitialProps, TState = TInitialProps, TActions = DefaultActions>(
  props: OnConstructProps<TInitialProps, TState, TActions>
) {
  const state = props.initialProps as unknown as TState
  return state
}

//

type ReducerSet<TState> = (setter: (state: TState) => Partial<TState>) => void
type InnerReducerSet<TState> = (setter: (state: TState) => Partial<TState>, state: TState) => void

/**
 * Reducer
 */
type ReducerProps<TState, TActions> = {
  prevState: TState
  state: TState
  action: TActions
  store: GenericStore<TState, TActions> & Record<string, any>
  set: ReducerSet<TState>
}

type Reducer<TState, TActions> = (props: ReducerProps<TState, TActions>) => TState

function defaultReducer<TState, TActions>(props: ReducerProps<TState, TActions>) {
  return props.state
}

/**
 * Create store options
 */
type CreateStoreOptions<TInitialProps, TState = TInitialProps, TActions = DefaultActions> = {
  onConstruct?: OnConstruct<TInitialProps, TState>
  reducer?: Reducer<TState, TActions>
}

export function createStoreFactory<
  TInitialProps,
  TState = TInitialProps,
  TActions extends BaseAction = DefaultActions
>(
  {
    onConstruct = defaultOnConstruct,
    reducer = defaultReducer,
  }: CreateStoreOptions<TInitialProps, TState, TActions> = {} as CreateStoreOptions<
    TInitialProps,
    TState,
    TActions
  >
): GenericStoreClass<TInitialProps, TState, TActions> {
  const StoreClass = class Store extends Subject {
    private_setStateCallbacks: ((state: TState) => Partial<TState>)[] = []

    state: TState

    constructor(initialProps: TInitialProps) {
      super()
      this.state = onConstruct({ initialProps, store: this })
    }

    private registerSet: InnerReducerSet<TState> = (setter, currentState) => {
      this.private_setStateCallbacks.push(setter)

      // mutating the current new state so user
      // can have access to the future value
      // in the same function
      const newState = setter(currentState)
      for (const key in newState) {
        Object.assign(currentState as any, { [key]: newState[key] })
      }
    }

    render(state: TState) {
      this.private_setStateCallbacks.forEach(setter => setter(state))
      this.private_setStateCallbacks = []
      this.notify()
    }

    dispatch(action: TActions) {
      const newState = { ...this.state }
      const processedState = reducer({
        action,
        prevState: this.state,
        state: newState,
        store: this,
        set: setState => this.registerSet(setState, newState),
      })
      if (action.transition == null) {
        this.state = processedState
        this.notify()
      } else {
        // the observers will be notified
        // when the transition is done
      }
    }
  }

  return StoreClass
}
