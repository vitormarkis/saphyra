import { Spinner } from "@blueprintjs/core"
import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { Devtools } from "~/devtools/devtools"
import { sleep } from "~/sleep"

type DispatchInAsyncState = {
  list: number[]
  $removedOnes: number[]
}

const newDisInAsync = newStoreDef<{}, DispatchInAsyncState>({
  onConstruct: () => ({ list: [] }),
  reducer({ prevState, state, action, async, set, dispatch }) {
    if (action.type === "add-num") {
      set(s => ({ list: [...s.list, action.num] }))
    }

    if (action.type === "remove-num") {
      set(s => ({ list: s.list.filter(x => x !== action.num) }))
    }

    if (action.type === "trigger") {
      // const randomNum = Math.floor(Math.random() * 100)
      const randomNum = 20
      dispatch({ type: "add-num", num: randomNum })
      async
        .promise(async () => {
          const randomNum = 40
          return randomNum
        })
        .onSuccess((numFromAPI, actor) => {
          actor.dispatch({ type: "remove-num", num: 20 })
          actor.set(s => ({ list: [...s.list, numFromAPI] }))
        })
    }

    // if (diff(["list"])) {

    // }

    return state
  },
})

const disInAsync = newDisInAsync({})

Object.assign(window, { disInAsync })

export const DispatchInAsync =
  createStoreUtils<typeof newDisInAsync>(disInAsync)

export function DispatchInAsyncPage() {
  const state = DispatchInAsync.useStore()
  const isLoading = DispatchInAsync.useTransition(["trigger"])

  return (
    <div className="flex flex-col p-4 overflow-hidden h-full">
      {isLoading && <Spinner />}
      <button
        onClick={() => {
          disInAsync.dispatch({
            type: "trigger",
            transition: ["trigger"],
          })
        }}
      >
        Trigger
      </button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
