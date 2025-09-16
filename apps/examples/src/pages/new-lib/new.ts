import { Subject, createSubject } from "./impl"

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

type SelectorType<TState> = <
  const TSelectors extends ((state: TState) => any)[],
>(
  reaction: Reaction<TState, TSelectors>
) => Reaction<TState, TSelectors>

function createSelector<TState>(): SelectorType<TState> {
  return <const TSelectors extends ((state: TState) => any)[]>(
    reaction: Reaction<TState, TSelectors>
  ): Reaction<TState, TSelectors> => {
    return reaction
  }
}

function builder() {
  let state: any = undefined
  let selectors: Array<Reaction<any, readonly ((state: any) => any)[]>> = []

  return {
    state<TState extends Record<string, Subject<any>>>(newState: TState) {
      state = newState
      return {
        selectors<
          const TSelectors extends Array<
            Reaction<TState, readonly ((state: TState) => any)[]>
          >,
        >(selectorList: TSelectors) {
          selectors = selectorList
          return {
            build: () => ({
              state,
              selectors,
            }),
            createSelector: createSelector<TState>(),
          }
        },
        build: () => ({
          state,
          selectors: [],
        }),
        createSelector: createSelector<TState>(),
      }
    },
  }
}

const builderInstance = builder().state({
  vitor: createSubject(true as const),
  age: createSubject(20 as const),
})

const result = builderInstance
  .selectors([
    builderInstance.createSelector({
      on: [s => s.vitor, s => s.age],
      run: (vitor, age) => {
        const vitor_value: true = vitor
        const age_value: 20 = age
        return `${vitor_value} ${age_value}`
      },
    }),
    builderInstance.createSelector({
      on: [s => s.age],
      run: age => {
        const age_value: 20 = age
        return `Age: ${age_value}`
      },
    }),
  ])
  .build()
