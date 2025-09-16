import { Subject, createSubject } from "./impl"

type MOCK_STATE = { vitor: Subject<true>; age: Subject<20> }

type ExtractValue<T> = T extends Subject<infer U> ? U : T

type SelectorValues<T extends readonly ((state: MOCK_STATE) => any)[]> = {
  [K in keyof T]: ExtractValue<ReturnType<T[K]>>
}

type Reaction<TSelectors extends readonly ((state: MOCK_STATE) => any)[]> = {
  on: TSelectors
  run: (...args: SelectorValues<TSelectors>) => void
}

function Selector<const TSelectors extends ((state: MOCK_STATE) => any)[]>(
  reaction: Reaction<TSelectors>
): [TSelectors, (...args: SelectorValues<TSelectors>) => void] {
  return [reaction.on, reaction.run]
}

function builder() {
  let state: MOCK_STATE | undefined
  let selectors: Array<Reaction<readonly ((state: MOCK_STATE) => any)[]>> = []

  return {
    state<TState extends MOCK_STATE>(newState: TState) {
      state = newState
      return {
        selectors<const TSelectors extends ((state: MOCK_STATE) => any)[]>(
          selectorList: Array<Reaction<TSelectors>>
        ) {
          selectors = selectorList
          return {
            build: () => ({
              state,
              selectors,
            }),
          }
        },
        build: () => ({
          state,
          selectors: [],
        }),
      }
    },
  }
}

const result = builder()
  .state({
    vitor: createSubject(true),
    age: createSubject(20),
  })
  .selectors([
    {
      on: [s => s.vitor, s => s.age],
      run: (vitor, age) => {
        const vitor_value: true = vitor
        const age_value: 20 = age
        return `${vitor_value} ${age_value}`
      },
    },
  ])
  .build()
