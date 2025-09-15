import { Subject } from "./impl"

type MOCK_STATE = { vitor: Subject<true>; age: Subject<20> }

type ExtractSubjectValue<T> = T extends Subject<infer U> ? U : T

type GenericReactions<
  TState extends Record<string, Subject<any>>,
  TSelectors extends ((state: TState) => any)[],
> = {
  on: TSelectors
  run: (
    ...args: {
      [K in keyof TSelectors]: ExtractSubjectValue<ReturnType<TSelectors[K]>>
    }
  ) => void
}

const Selector = function <
  TState extends MOCK_STATE,
  TSelectors extends ((state: TState) => any)[],
>({ on, run }: GenericReactions<TState, TSelectors>) {
  return [on, run]
}

Selector({
  on: [s => s.vitor, s => s.age],
  run: (vitor, age) => `${vitor} ${age}`,
})
