import { Subject } from "./impl"

type MOCK_STATE = { vitor: Subject<true>; age: Subject<20> }

type ExtractValue<T> = T extends Subject<infer U> ? U : T

type SelectorValues<T extends readonly ((state: MOCK_STATE) => any)[]> = {
  [K in keyof T]: ExtractValue<ReturnType<T[K]>>
}

type Reaction<TSelectors extends readonly ((state: MOCK_STATE) => any)[]> = {
  on: TSelectors
  run: (...args: SelectorValues<TSelectors>) => void
}

function Selector<
  const TSelectors extends readonly ((state: MOCK_STATE) => any)[],
>(
  reaction: Reaction<TSelectors>
): [TSelectors, (...args: SelectorValues<TSelectors>) => void] {
  return [reaction.on, reaction.run]
}

Selector({
  on: [s => s.vitor, s => s.age],
  run: (vitor, age) => {
    const vitor_value: true = vitor
    const age_value: 20 = age
    return `${vitor_value} ${age_value}`
  },
})
