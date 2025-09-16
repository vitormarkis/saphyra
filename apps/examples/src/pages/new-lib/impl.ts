import { EventsTuple } from "saphyra"

type Selector<TState> = (state: TState) => unknown

type GenericState = Record<string, any>
type Store<
  TState extends GenericState = GenericState,
  TDerivations extends Record<string, any> = {},
  TReactions extends Array<
    Reaction<
      TState & TDerivations,
      readonly ((state: TState & TDerivations) => any)[]
    >
  > = Array<
    Reaction<
      TState & TDerivations,
      readonly ((state: TState & TDerivations) => any)[]
    >
  >,
> = {
  state: TState
  derivations: TDerivations
  reactions: TReactions
}

function newStore() {
  let state: any = undefined
  let derivations: any = {}
  let reactions: Array<Reaction<any, readonly ((state: any) => any)[]>> = []

  function react<TState, const TSelectors extends ((state: TState) => any)[]>(
    reaction: Reaction<TState, TSelectors>
  ): Reaction<TState, TSelectors> {
    return reaction
  }

  function derive<TState, const TSelectors extends ((state: TState) => any)[]>(
    derivation: Derivation<TState, TSelectors>
  ): Derivation<TState, TSelectors> {
    return derivation
  }

  return {
    state<TState extends Record<string, Subject<any>> | Subject<any>>(
      stateBuilder: (
        newSubject: <T>(
          init: T,
          ...events: Array<Handler<T | ((prev: T) => T)>>
        ) => Subject<T>
      ) => TState
    ) {
      state = stateBuilder(createSubject)
      return {
        derivations<TDerivations extends Record<string, any>>(
          derivationBuilder: (
            newDerivation: <
              const TSelectors extends ((state: TState) => any)[],
            >(
              derivation: Derivation<TState, TSelectors>
            ) => Derivation<TState, TSelectors>
          ) => TDerivations
        ) {
          derivations = derivationBuilder(derive)
          return {
            reactions(
              reactionBuilder: (
                react: <
                  const TSelectors extends ((
                    state: TState & TDerivations
                  ) => any)[],
                >(
                  reaction: Reaction<TState & TDerivations, TSelectors>
                ) => Reaction<TState & TDerivations, TSelectors>
              ) => Array<
                Reaction<
                  TState & TDerivations,
                  readonly ((state: TState & TDerivations) => any)[]
                >
              >
            ) {
              reactions = reactionBuilder(react)
              return {
                build: () => ({
                  state,
                  derivations,
                  reactions,
                }),
              }
            },
            build: () => ({
              state,
              derivations,
              reactions: [],
            }),
          }
        },
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
              derivations: {},
              reactions,
            }),
          }
        },
        build: () => ({
          state,
          derivations: {},
          reactions: [],
        }),
      }
    },
  }
}

type Handler<E> = <O>(transform: (e: E) => O) => Handler<O>

export function createEvent<T>(): [(value: T) => void, Handler<T>] {
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

type Derivation<
  TState,
  TSelectors extends readonly ((state: TState) => any)[],
> = {
  on: TSelectors
  run: (...args: SelectorValues<TState, TSelectors>) => any
}

const store = newStore()
  .state(newSubject => ({
    count: newSubject(
      0,
      onIncrementCount(delta => prevCount => prevCount + delta),
      onDecrementCount(delta => prevCount => prevCount - delta),
      onResetCount(() => () => 0)
    ),
    role: newSubject(
      "user" as "user" | "admin",
      onChangeRole(newRole => () => newRole)
    ),
    username: newSubject(
      "",
      onNewUsername(newUsername => () => newUsername)
    ),
    permissions: newSubject(
      [] as Permission[],
      onNewPermissions(newPermissions => () => newPermissions)
    ),
  }))
  .derivations(newDerivation => ({
    firstPermission: newDerivation({
      on: [s => s.permissions],
      run: permissions => permissions[0],
    }),
    welcomeMessage: newDerivation({
      on: [s => s.username, s => s.role],
      run: (username, role) => `Welcome ${username}! Your role is [${role}].`,
    }),
  }))
  .reactions(newReact => [
    newReact({
      on: [s => s.role],
      run: role => emitRoleChanged(role),
    }),
  ])
  .build()

type Permission = string

store.state.count

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

function testModule<TEvents extends unknown[], T>(
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
