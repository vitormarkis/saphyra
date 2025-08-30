import { useState } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { Button } from "~/components/ui/button"
import { sleep } from "~/sleep"

type MultipleOptimisticUpdatesState = {
  countdown: number
  msg: string
}

type MultipleOptimisticUpdatesActions = {
  type: "fire"
}

const newStore = newStoreDef<
  MultipleOptimisticUpdatesState,
  MultipleOptimisticUpdatesState,
  MultipleOptimisticUpdatesActions
>({
  reducer({ prevState, state, action, set, async, optimistic }) {
    if (action.type === "fire") {
      async().promise(async () => {
        const finalCount = await new Promise<number>(async resolve => {
          let i = 0
          for (let _; i < 7; i++) {
            optimistic({ countdown: i })
            optimistic(state => ({ countdown: state.countdown + 1 }))
            console.log("22- a")
            await sleep(500 + i * 80)
            console.log("22- b")
          }
          resolve(i)
        })

        set({ countdown: finalCount })
      })
    }

    return state
  },
})

const Store = createStoreUtils<typeof newStore>()

export function MultipleOptimisticUpdatesPage() {
  const [store, resetStore, isLoading] = useNewStore(() =>
    newStore({
      countdown: 0,
      msg: "hello",
    })
  )

  return (
    <Store.Context.Provider value={[store, resetStore, isLoading]}>
      <Content />
    </Store.Context.Provider>
  )
}

function Content() {
  const [store] = Store.useStore()
  const state = Store.useSelector()
  const loading = Store.useTransition(["fire"])
  return (
    <div className="flex flex-col">
      <pre>{JSON.stringify({ loading }, null, 2)}</pre>
      <Button
        onClick={() => {
          store.dispatch({ type: "fire", transition: ["fire"] })
        }}
      >
        Fire
      </Button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}
