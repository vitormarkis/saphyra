import { createStoreUtils } from "../../create-store/createStoreUtils"
import { newStoreDef } from "../../create-store/store"
import { sleep } from "~/sleep"

type State = {
  name: string
  surname: string
  $fullname: string
}

const newStore = newStoreDef<State>({
  reducer({ state, action, async, set, diff, dispatch }) {
    console.log("run!")

    if (action.type === "update-state") {
      set(action.state)
    }

    if (action.type === "update-state") {
      async.promise(async () => {
        set(action.state)
      })
    }

    if (action.type === "derive-fullname") {
      set(s => ({ $fullname: `${s.name} ${s.surname}` }))
    }

    if (action.type === "capitalize-first-name") {
      set({ name: state.name.charAt(0).toUpperCase() + state.name.slice(1) })
    }

    if (diff(["name", "surname"])) {
      if (!state.name.charAt(0).match(/[A-Z]/)) {
        dispatch({ type: "capitalize-first-name" })
      }
      async.promise(async () => {
        dispatch({ type: "derive-fullname" })
      })
    }

    return state
  },
})

const store = newStore({
  name: "vitor",
  surname: "markis",
})

export const Store = createStoreUtils<typeof newStore>(store)

export function ReducerDispatchWhenActorAsync() {
  const state = Store.useStore()
  const isBootstraping = Store.useTransition(["bootstrap"])
  const updating = Store.useTransition(["update-state"])

  return (
    <div className="flex flex-col p-4 overflow-hidden h-full">
      {isBootstraping ? (
        "Loading..."
      ) : (
        <pre>{JSON.stringify(state, null, 2)}</pre>
      )}

      <button
        aria-busy={updating}
        disabled={updating}
        onClick={() => {
          store.dispatch({
            type: "update-state",
            state: {
              name: "lucas",
              surname: "maia",
            },
            transition: ["update-state"],
          })
        }}
      >
        Trigger
      </button>
    </div>
  )
}
