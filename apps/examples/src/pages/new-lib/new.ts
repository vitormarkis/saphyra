import { Subject, createEvent, createSubject } from "./impl"

type ExtractValue<T> = T extends Subject<infer U> ? U : T

type SelectorValues<TState, T extends readonly ((state: TState) => any)[]> = {
  [K in keyof T]: ExtractValue<ReturnType<T[K]>>
}

type Reaction<
  TState,
  TSelectors extends readonly ((state: TState) => any)[],
> = {
  on: TSelectors
  run: (...args: SelectorValues<TState, TSelectors>) => void
}

function react<TState, const TSelectors extends ((state: TState) => any)[]>(
  reaction: Reaction<TState, TSelectors>
): Reaction<TState, TSelectors> {
  return reaction
}

function builder() {
  let state: any = undefined
  let reactions: Array<Reaction<any, readonly ((state: any) => any)[]>> = []

  return {
    state<TState extends Record<string, Subject<any>> | Subject<any>>(
      stateBuilder: (newSubject: <T>(init: T) => Subject<T>) => TState
    ) {
      state = stateBuilder(createSubject)
      return {
        reactions(
          reactionBuilder: (
            react: <const TSelectors extends ((state: TState) => any)[]>(
              reaction: Reaction<TState, TSelectors>
            ) => Reaction<TState, TSelectors>
          ) => Array<Reaction<TState, readonly ((state: TState) => any)[]>>
        ) {
          reactions = reactionBuilder(react)
          return {
            build: () => ({
              state,
              reactions,
            }),
          }
        },
        build: () => ({
          state,
          reactions: [],
        }),
      }
    },
  }
}

const result = builder()
  .state(newSubject => ({
    vitor: newSubject(true),
    age: newSubject(20),
  }))
  .reactions(newReact => [
    newReact({
      on: [s => s.age],
      run: age => console.log("Age changed", age),
    }),
    newReact({
      on: [s => s.vitor, s => s.age],
      run: (vitor, age) => console.log("Vitor's age is", age, vitor),
    }),
  ])
  .build()

const [emitIncrement, onIncrement] = createEvent<number>()
const [emitDecrement, onDecrement] = createEvent<number>()

const counter = builder()
  .state(newSubject =>
    newSubject(
      0,
      onIncrement(delta => prevCount => prevCount + delta)
    )
  )
  .reactions(newReact => [
    newReact({
      on: [s => s],
      run: count => console.log("Count changed", count),
    }),
  ])
  .build()

counter.state.value = 10

type Diff<TState, TSelectors extends readonly ((state: TState) => any)[]> = {
  on: TSelectors
  run: (...args: SelectorValues<TState, TSelectors>) => void
}

export function createDiff<TState>(prevState: TState, newState: TState) {
  function diff<const TSelectors extends ((state: TState) => any)[]>({
    on,
    run,
  }: Diff<TState, TSelectors>) {
    const hasChanges = on.some(
      selector => selector(prevState) !== selector(newState)
    )
    if (hasChanges) {
      run(...on.map(selector => selector(newState)))
    }
  }
  return diff
}

export function createDiffBuilder<TState>(prevState: TState, newState: TState) {
  return () => ({
    on<const TSelectors extends ((state: TState) => any)[]>(
      selectors: TSelectors
    ) {
      return {
        run<TArgs extends SelectorValues<TState, TSelectors>>(
          run: (...args: TArgs) => void
        ) {
          const hasChanges = selectors.some(
            selector => selector(prevState) !== selector(newState)
          )
          if (hasChanges) {
            run(...selectors.map(selector => selector(newState)))
          }
        },
      }
    },
  })
}
