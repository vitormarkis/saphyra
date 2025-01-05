import { Subject } from "../Subject"
import { createAsync } from "./createAsync"
import { TransitionsStore } from "./transitions-store"
import {
  Async,
  BaseAction,
  BaseState,
  DefaultActions,
  GenericStore,
  GenericStoreClass,
  TODO,
  TransitionsExtension,
} from "./types"

/**
 * On construct
 */
type OnConstructProps<
  TInitialProps,
  TState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  initialProps: TInitialProps
  store: GenericStore<TState, TActions> & Record<string, any>
}

type OnConstruct<
  TInitialProps,
  TState = TInitialProps,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = (props: OnConstructProps<TInitialProps, TState, TActions>) => TState

function defaultOnConstruct<
  TInitialProps,
  TState = TInitialProps,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
>(props: OnConstructProps<TInitialProps, TState, TActions>) {
  const state = props.initialProps as unknown as TState
  return state
}

//

type ReducerSet<TState> = (setter: (state: TState) => Partial<TState>) => void
type InnerReducerSet<TState> = (
  setter: (state: TState) => Partial<TState>,
  state: TState,
  transition: any[] | null | undefined
) => void

/**
 * Reducer
 */
type ReducerProps<TState, TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction> = {
  prevState: TState
  state: TState
  action: TActions
  store: GenericStore<TState, TActions> & Record<string, any>
  set: ReducerSet<TState>
  async: Async<TState>
}

type Reducer<TState, TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction> = (
  props: ReducerProps<TState, TActions>
) => TState

function defaultReducer<TState, TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction>(
  props: ReducerProps<TState, TActions>
) {
  return props.state
}

/**
 * Create store options
 */
type CreateStoreOptions<
  TInitialProps,
  TState = TInitialProps,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
> = {
  onConstruct?: OnConstruct<TInitialProps, TState>
  reducer?: Reducer<TState, TActions>
}

export function createStoreFactory<
  TInitialProps,
  TState extends BaseState = TInitialProps & BaseState,
  TActions extends DefaultActions & BaseAction = DefaultActions & BaseAction
>(
  {
    onConstruct = defaultOnConstruct,
    reducer = defaultReducer,
  }: CreateStoreOptions<TInitialProps, TState, TActions> = {} as CreateStoreOptions<
    TInitialProps,
    TState,
    TActions
  >
): (initialProps: TInitialProps) => GenericStore<TState, TActions> & TransitionsExtension {
  const StoreClass = class Store extends Subject {
    transitions = new TransitionsStore()

    setStateCallbacks: Record<string, Array<(state: TState) => Partial<TState>>> = {}

    state: TState

    constructor(initialProps: TInitialProps) {
      super()
      this.state = onConstruct({ initialProps, store: this })
    }

    registerSet: InnerReducerSet<TState> = (setter, currentState, transition) => {
      if (transition) {
        const transitionKey = transition.join(":")
        this.setStateCallbacks[transitionKey] ??= []
        this.setStateCallbacks[transitionKey].push(setter)
      }

      // mutating the current new state so user
      // can have access to the future value
      // in the same function
      const newState = setter(currentState)
      for (const key in newState) {
        Object.assign(currentState as any, { [key]: newState[key] })
      }
    }

    setState(newState: Partial<TState>) {
      this.state = { ...this.state, ...newState }
      this.notify()
    }

    private applyTransition(transition: any[] | null | undefined) {
      if (!transition) {
        debugger
        throw new Error("No transition provided.")
      }
      const transitionKey = transition.join(":")
      const setters = this.setStateCallbacks[transitionKey]
      if (!setters) throw new Error("Impossible to reach this point")
      this.setStateCallbacks[transitionKey] = []
      const newState = setters.reduce((acc: TState, setter) => ({ ...acc, ...setter(acc) }), this.state)
      const async = createAsync(this.transitions, newState, transition, this.registerSet)
      this.state = reducer({
        action: { type: "noop" } as TActions,
        prevState: this.state,
        async,
        set: setState => this.registerSet(setState, newState, null),
        store: this,
        state: newState,
      })
      this.notify()
    }

    dispatch(action: TActions) {
      const newState = { ...this.state }

      const store = this
      if (action.transition != null) {
        newState.currentTransition = action.transition
        store.transitions.events.done.once(action.transition.join(":"), error => {
          if (!action.transition) throw new Error("Impossible to reach this point")
          console.log(`%cTransition completed! [${action.transition.join(":")}]`, "color: lightgreen")
          store.applyTransition(action.transition)
        })
      }

      const processedState = reducer({
        action,
        prevState: this.state,
        state: newState,
        store,
        set: setState => this.registerSet(setState, newState, action.transition),
        async: createAsync(this.transitions, newState, action.transition, this.registerSet),
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

  return (initialProps: TInitialProps) => {
    const Class = StoreClass
    return new Class(initialProps) as unknown as GenericStore<TState, TActions> & TransitionsExtension
  }
}
