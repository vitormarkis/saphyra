import { EventsTuple } from "saphyra"

type GenericState = Record<string, any>
type Store<
  TState extends GenericState = GenericState,
  TReactions extends Array<GenericReactions<TState, any[]>> = Array<
    GenericReactions<TState, any[]>
  >,
> = {
  state: TState
  reactions: TReactions
}

function newStore() {
  const store = {} as Store

  function reactionsBuilder<
    TState extends Record<string, Subject<any>>,
    TReactions extends Array<GenericReactions<TState, any[]>> = Array<
      GenericReactions<TState, any[]>
    >,
  >(reactions: TReactions) {
    Object.assign(store, { reactions })
    return {
      build: () => store as Store<TState, TReactions>,
    }
  }

  function stateBuilder<TState extends GenericState>(state: TState) {
    store.state = state
    return {
      build: () => store as Store<TState>,
      reactions: <TReactions extends Array<GenericReactions<TState, any[]>>>(
        reactions: TReactions
      ) => reactionsBuilder<TState, TReactions>(reactions),
    }
  }

  return {
    state: stateBuilder,
  }
}

type Handler<E> = <O>(transform: (e: E) => O) => Handler<O>

function createEvent<T>(): [(value: T) => void, Handler<T>] {
  const handlers: Array<(value: T) => void> = []

  const handler: Handler<T> = transform => {
    return createEvent<ReturnType<typeof transform>>()[1]
  }

  const emit = (value: T) => {
    handlers.forEach(h => h(value))
  }

  return [emit, handler]
}

const [emitChangeRole, onChangeRole] = createEvent<"user" | "admin">()
const [emitRoleChanged, onRoleChanged] = createEvent<"user" | "admin">()
const [emitNewUsername, onNewUsername] = createEvent<string>()
const [emitNewPermissions, onNewPermissions] = createEvent<Permission[]>()
const [emitIncrementCount, onIncrementCount] = createEvent<number>()
const [emitDecrementCount, onDecrementCount] = createEvent<number>()
const [emitResetCount, onResetCount] = createEvent<number>()

type OnInitType = {
  role: "user" | "admin"
  username: string
  permissions: Permission[]
}

type GenericReactions<
  TState extends Record<string, Subject<any>>,
  TArgument extends (state: TState) => any,
> = {
  on: TArgument[]
  run: (args: ReturnType<TArgument>) => void
}

type MOCK_STATE = { vitor: Subject<true>; markis: Subject<false> }

const Selector = function <
  TState extends MOCK_STATE,
  TArguments extends ((state: TState) => any)[],
>({ on, run }: GenericReactions<MOCK_STATE, TArguments>) {
  return [on, run]
}

Selector({
  on: [s => s.vitor, s => s.markis],
  run: (vitor, markis) => `${vitor} ${markis}`,
})

const store = newStore()
  .state({
    count: createSubject(
      0,
      onIncrementCount(delta => prevCount => prevCount + delta),
      onDecrementCount(delta => prevCount => prevCount - delta),
      onResetCount(() => () => 0)
    ),
    role: createSubject(
      "user" as "user" | "admin",
      onChangeRole(newRole => () => newRole)
    ),
    username: createSubject(
      "vitor",
      onNewUsername(newUsername => () => newUsername)
    ),
    permissions: createSubject(
      [] as Permission[],
      onNewPermissions(newPermissions => () => newPermissions)
    ),
  })
  .reactions([
    {
      on: [s => s.count],
      run: () => emitRoleChanged(count),
    },
  ])
  .build()
// ({
//   onInit(payload: {
//     role: "user" | "admin"
//     username: string
//     permissions: Permission[]
//   }) {
//     console.log("Initialized")
//   },
// })

type Permission = string

type State<T> = {
  value: T
}

export function createSubject<T>(
  init: T,
  ...events: Array<Handler<T | ((prev: T) => T)>>
) {
  const subject = {
    value: init,
    events,
    reducer: <TAction>(prev: T, _: TAction) => prev,
  }

  const builder = {
    defineReducer: <TAction>(reducer: (prev: T, action: TAction) => T) => {
      Object.assign(subject, { reducer })
      return subject
    },
  }

  Object.assign(builder, subject)
  return subject as typeof builder & typeof subject
}

export type Subject<T> = ReturnType<typeof createSubject<T>>

function createState<T>(initialValue: T, ...events: Handler<T>[]): State<T> {
  return {
    value: initialValue,
  }
}

function testModule<TEvents extends any[], T>(
  build: (
    builder: (e: TEvents) => { build: <T>(setter: (e: TEvents) => T) => T }
  ) => T
) {
  return build(e => ({
    build: <T>(setter: (e: TEvents) => T) => setter(e),
  }))
}

const result = testModule(b => {
  return b([true]).build(e => ({ vitor: true }))
})
