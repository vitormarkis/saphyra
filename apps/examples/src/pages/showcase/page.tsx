import { useState } from "react"
import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"
import { Waterfall } from "~/devtools/waterfall"
import { cn } from "~/lib/cn"
import { config } from "./config"
import { sleep } from "~/sleep"
import { toast } from "sonner"

type ShowcaseState = {
  counter: number
}

const newShowcaseStore = newStoreDef<
  ShowcaseState,
  ShowcaseState,
  {
    type: "increment"
  }
>({
  reducer({ state, action, set, async }) {
    if (action.type === "increment") {
      async()
        .setName("inc")
        .promise(async ({ signal }) => {
          await sleep(1500, "", signal)
          set(s => ({ counter: s.counter + 1 }))
        })
    }

    return state
  },
})

const Showcase = createStoreUtils<typeof newShowcaseStore>()

export function ShowcasePage() {
  const [showcaseStore] = useState(() =>
    newShowcaseStore({ counter: 0 }, config)
  )

  return (
    <Showcase.Provider value={[showcaseStore]}>
      <div className="flex flex-col">
        <div className="flex-1">
          <ShowcasePageContent />
        </div>
        <div className="flex-1">
          <Waterfall store={showcaseStore} />
        </div>
      </div>
    </Showcase.Provider>
  )
}

type ShowcasePageContentProps = {}

export function ShowcasePageContent({}: ShowcasePageContentProps) {
  const [store] = Showcase.useUseState()
  const counter = Showcase.useOptimisticStore(s => s.counter)
  const isIncrementing = Showcase.useTransition(["increment"])

  return (
    <div className="flex gap-2 size-full">
      <div className="flex flex-col gap-2 size-full">
        <button
          onClick={() => {
            store.dispatch({
              type: "increment",
              transition: ["increment"],
              onTransitionEnd({ state }) {
                toast.success(`Incremented [${state.counter}]`)
              },
            })
          }}
        >
          Increment
        </button>
        <div
          className={cn(
            "size-full flex items-center justify-center",
            isIncrementing && "opacity-50 cursor-not-allowed"
          )}
          aria-busy={isIncrementing}
        >
          <span className="text-9xl font-black tabular-nums">{counter}</span>
        </div>
      </div>
    </div>
  )
}
