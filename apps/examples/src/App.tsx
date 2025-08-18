import { Spinner } from "@blueprintjs/core"
import { useEffect, useState } from "react"
import { sleep } from "./sleep"
import { Devtools } from "~/devtools/devtools"
import { Waterfall } from "./devtools/waterfall"
import {
  AsyncOperation,
  AsyncPromiseOnFinishProps,
  newAsyncOperation,
  newStoreDef,
  SomeStoreGeneric,
  Transition,
} from "saphyra"
import { createStoreUtils, useHistory, useNewStore } from "saphyra/react"
import { createClassModel, Handlers } from "./new-class-model"
import { noop } from "./lib/utils"

type Event =
  | {
      type: "wrap-promise"
      config: {
        label: string
      }
      promiseFn: (ctx: { signal: AbortSignal }) => Promise<any>
      onFinish: AsyncPromiseOnFinishProps
    }
  | {
      type: "got-new-async-operation"
      asyncOperation: AsyncOperation
    }
  | {
      type: "process-promise"
      when: number
      promiseFn: (ctx: { signal: AbortSignal }) => Promise<any>
      asyncOperation: AsyncOperation
    }
  | {
      type: "process-promise-with-finish-id"
      onFinishId: string
    }

type State = {
  asyncOperation: AsyncOperation | null
  keysToAdd: Set<{
    transition: Transition
    asyncOperation: AsyncOperation
    label: string
  }>
  cleanUpsFinish: Set<string>
}

type Deps = {
  store: SomeStoreGeneric
  transition: Transition
  onAsyncOperation: (asyncOperation: AsyncOperation) => void
  from: string
}

const counterModel = ({ onAsyncOperation, store, transition, from }: Deps) =>
  createClassModel<Event, State>(
    {
      asyncOperation: null,
      keysToAdd: new Set(),
      cleanUpsFinish: new Set(),
    },
    ({ event, emit, prevState, state }) => {
      state.cleanUpsFinish = (() => {
        if (event.type === "process-promise-with-finish-id") {
          state.cleanUpsFinish.add(event.onFinishId)
          return new Set(state.cleanUpsFinish)
        }
        return state.cleanUpsFinish
      })()

      state.keysToAdd = (() => {
        if (event.type === "process-promise") {
          state.keysToAdd.add({
            asyncOperation: event.asyncOperation,
            label: `async-promise/${from}`,
            transition,
          })
          return new Set(state.keysToAdd)
        }
        return state.keysToAdd
      })()

      if (event.type === "wrap-promise") {
        const { config, promiseFn, onFinish } = event
        const when = Date.now()
        const fn = () => {
          emit({
            type: "process-promise",
            when,
            promiseFn,
            asyncOperation,
          })

          // onFinish handle
          const onFinishId = Array.isArray(onFinish?.id)
            ? onFinish.id.join(":")
            : onFinish?.id

          emit({
            type: "process-promise-with-finish-id",
            onFinishId,
          })
        }
        const asyncOperation = newAsyncOperation({
          fn,
          when,
          type: "promise",
          label: config?.label ?? null,
        })

        state.asyncOperation = asyncOperation
      }

      if (event.type === "$finish") {
        if (state.cleanUpsFinish.size > 0) {
          state.cleanUpsFinish.forEach(id => {
            state.cleanUpsFinish.delete(id)
            const cleanUpList = store.transitions.finishCallbacks.cleanUps[id]
            cleanUpList?.forEach(cleanUp => cleanUp())
          })
        }

        if (!prevState.asyncOperation && !!state.asyncOperation) {
          onAsyncOperation(state.asyncOperation)
          state.asyncOperation = null
        }

        if (prevState.keysToAdd.size > 0) {
          state.keysToAdd.forEach(key => {
            state.keysToAdd.delete(key)
            store.transitions.doneKey(
              key.transition,
              key.asyncOperation,
              { onFinishTransition: noop },
              key.label
            )
          })
        }
      }
    }
  )
Object.assign(window, { counterModel })

type CounterState = {
  count: number
  $direction: "up" | "down"
}

type CounterActions =
  | {
      type: "increment"
    }
  | {
      type: "decrement"
    }
  | {
      type: "increment-ten"
    }
  | {
      type: "increment-three"
    }

const newCount = newStoreDef<CounterState, CounterState, CounterActions>({
  reducer({ prevState, state, action, async, set }) {
    if (action.type === "increment") {
      set(s => ({ count: s.count + 1 }))
    }
    if (action.type === "decrement") {
      set(s => ({ count: s.count - 1 }))
    }

    if (action.type === "increment-ten") {
      async()
        .setName("increment-ten")
        .promise(async ctx => {
          await sleep(2000, "incrementing a lot", ctx.signal)
          set(s => ({ count: s.count + 10 }))
        })
    }

    if (action.type === "increment-three") {
      async()
        .setName("increment-three")
        .promise(async ctx => {
          await sleep(2000, "incrementing a little bit", ctx.signal)
          set(s => ({ count: s.count + 3 }))
        })
    }

    if (state.count !== prevState.count) {
      set(s => ({
        $direction: prevState.count <= s.count ? "up" : "down",
      }))
    }

    return state
  },
})

export const Todos = createStoreUtils<typeof newCount>()

export default function App() {
  const [homeStore, resetHomeStore, isLoading] = useNewStore(() =>
    newCount({
      count: 0,
    })
  )

  useHistory(homeStore)

  useEffect(() => {
    Object.assign(window, { homeStore })
  }, [homeStore])

  return (
    <Todos.Context.Provider value={[homeStore, resetHomeStore, isLoading]}>
      <div className="grid grid-rows-[auto_auto_1fr] gap-4 overflow-y-hidden">
        <Content />
        <div className="min-h-[160px]">
          {/* <Devtools store={homeStore} /> */}
        </div>
        <div className="">
          <Waterfall store={homeStore} />
        </div>
      </div>
    </Todos.Context.Provider>
  )
}

export function Content() {
  const [todosStore] = Todos.useStore()
  const isTransitioning = Todos.useTransition(["increment"])
  const state = Todos.useTransitionSelector(["increment"])
  useEffect(() => console.log({ state }), [state])

  return (
    <div className="flex flex-col">
      <pre>{JSON.stringify(state, null, 2)}</pre>
      <span className="bg-lime-50 dark:bg-lime-950 text-lime-800/80 border dark:border-lime-800 dark:text-lime-50 border-lime-300 rounded-sm px-2 py-1 text-xs/none h-fit mb-2 w-fit">
        Mess around and press CTRL Z and CTRL Y to undo and redo
      </span>
      <div className="flex gap-4">
        <div className="flex gap-2 @2xl:flex-row flex-col">
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "increment",
              })
            }}
          >
            Increment
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "decrement",
              })
            }}
          >
            Decrement
          </button>
          <button
            onClick={async () => {
              todosStore.dispatch({
                type: "increment-ten",
                transition: ["increment", "ten"],
                beforeDispatch({ action, transition, abort }) {
                  abort(transition)
                  return action
                },
              })
            }}
          >
            Increment (10) [async]
          </button>
          <button
            onClick={() => {
              todosStore.dispatch({
                type: "increment-three",
                transition: ["increment", "three"],
              })
            }}
          >
            Increment (3) [async]
          </button>
        </div>
        <div className="flex">{isTransitioning && <Spinner size={14} />}</div>
      </div>
    </div>
  )
}
