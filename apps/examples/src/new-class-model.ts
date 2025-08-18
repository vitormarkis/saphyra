type ReducerProps<
  TEvent extends { type: string } | Record<string, any>,
  TState extends Record<string, any>,
> = {
  prevState: TState
  state: TState
  event: TEvent
  emit: (event: TEvent) => void
}

export function createClassModel<
  TEvent extends { type: string } & Record<string, any>,
  TState extends Record<string, any> = Record<string, any>,
>(
  initialState: TState,
  reducer: (props: ReducerProps<{ type: "$finish" } | TEvent, TState>) => any
) {
  const emit = (event: { type: "$finish" } | TEvent) => {
    let prevState = { ...initialState }
    const newState = reducer({
      prevState,
      state: initialState,
      event,
      emit,
    })
    initialState = newState
    prevState = newState
    const newStateAfterFinish = reducer({
      prevState,
      state: initialState,
      event: {
        type: "$finish",
      } as TEvent,
      emit,
    })
    initialState = newStateAfterFinish
  }

  return {
    getState: () => initialState,
    emit,
  }
}

export type Handlers<
  TState extends Record<string, any>,
  TEvent extends { type: "$finish" | string } & Record<string, any>,
> = {
  [K in TEvent["type"]]: (props: ReducerProps<TEvent, TState>) => TState
}
