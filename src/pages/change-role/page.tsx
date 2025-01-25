import { Spinner } from "@blueprintjs/core"
import { createStoreUtils } from "../../createStoreUtils"
import { cn } from "../../lib/utils"
import { fetchRole } from "./fn/fetch-role"
import { useHistory } from "~/hooks/use-history"
import { newStoreDef } from "~/create-store"
import { useCallback, useState } from "react"
import { useBootstrapError } from "~/create-store/hooks/useBootstrapError"
import { ErrorPage } from "~/components/error-page"
import { fetchPermissions } from "~/pages/change-role/fn/get-permissions"

type SelectedRole = "user" | "admin"

type AuthStoreState = {
  role: "user" | "admin"
  currentTransition: any[] | null
  username: string
  $permissions: string[]
  $welcomeMessage: string
  $firstPermission: string
}

type AuthStoreActions = ChangeRole
type ChangeRole = {
  type: "change-role"
  role: SelectedRole
}

const newAuthStore = newStoreDef<
  AuthStoreState,
  AuthStoreState,
  AuthStoreActions,
  { vitor: [name: "markis"] }
>({
  reducer({ prevState, state, action, diff, set, async }) {
    if (action?.type === "change-role") {
      async
        .promise(({ signal }) => fetchRole({ roleName: action.role, signal }))
        .onSuccess((role, actor) => {
          actor.set({ role })
        })
    }

    if (prevState.role !== state.role) {
      async
        .promise(({ signal }) => fetchPermissions({ role: state.role, signal }))
        .onSuccess((permissions, actor) => {
          actor.set({ $permissions: permissions })
        })
    }

    set(s => (s.$permissions != null ? { $firstPermission: s.$permissions[0] } : s))

    if (diff(["username", "role"])) {
      set(s => ({
        $welcomeMessage: `Welcome ${s.username}! Your role is [${s.role}].`,
      }))
    }

    return state
  },
})

export const Auth = createStoreUtils<typeof newAuthStore>()

export function ChangeRolePage() {
  const instantiateStore = useCallback(
    () =>
      newAuthStore({
        role: "user",
        currentTransition: null,
        username: "",
      }),
    []
  )
  const authStoreState = useState(instantiateStore)
  const [authStore] = authStoreState
  const isBootstraping = Auth.useTransition(["bootstrap"], authStore)
  const [error, tryAgain] = useBootstrapError(authStoreState, instantiateStore)

  if (error != null) {
    return (
      <ErrorPage
        error={error}
        tryAgain={tryAgain}
      />
    )
  }

  if (isBootstraping)
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center gap-2 h-full">
          <div className="w-full grid place-items-center">
            <Spinner size={96} />
          </div>
        </div>
      </div>
    )

  return (
    <Auth.Provider value={authStoreState}>
      <ChangeRolePageContent />
    </Auth.Provider>
  )
}

function ChangeRolePageContent() {
  const [authStore] = Auth.useUseState()
  const state = Auth.useStore()

  const isChangingRole = Auth.useTransition(["auth", "role"])

  useHistory(authStore)

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={state.username}
          placeholder="Your username..."
          onChange={e => {
            const value = e.target.value
            authStore.setState({
              username: value,
            })
          }}
        />
        <select
          name=""
          id=""
          value={state.role}
          // disabled={isChangingRole}
          className={cn(
            "disabled:opacity-30 disabled:cursor-not-allowed",
            isChangingRole && "opacity-30"
          )}
          onChange={e => {
            const selectedRole = e.target.value as "user" | "admin"
            authStore.dispatch({
              type: "change-role",
              role: selectedRole,
              transition: ["auth", "role"],
              beforeDispatch: ({ action, meta }) => {
                const now = Date.now()
                meta.timestamps ??= []
                meta.timestamps = meta.timestamps.filter((ts: number) => now - ts < 1000)
                if (meta.timestamps.length >= 2) return
                meta.timestamps.push(now)
                return action
              },
            })
          }}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {isChangingRole ? <Spinner size={16} /> : null}
      </div>

      {/* <pre className={cn("disabled:opacity-30 disabled:cursor-not-allowed")}>
        {JSON.stringify(state, null, 2)}
      </pre> */}
      <Auth.Devtools allExpanded />
      <div className=" bg-fuchsia-300/10 dark:bg-fuchsia-700/10 border px-4 py-2 rounded-md border-fuchsia-500/20">
        <h3 className="text-lg font-bold dark:text-fuchsia-200 text-fuchsia-600">Explanation:</h3>
        <p className="dark:[&_strong]:text-white dark:[&_i]:text-fuchsia-300/50 dark:text-fuchsia-300 [&_strong]:text-fuchsia-700 [&_i]:text-fuchsia-800/50 text-fuchsia-500">
          Changing role works as a transaction. It fetches the role, and based on the role info,
          fetch the permissions. If one of the requests fails, all the changes made by the
          transition <strong>are discarded</strong> and <strong>no changes are made</strong>.
          <br />
          <br />
          It is made this way to prevent your store state to end up in a invalid state{" "}
          <i>(e.g: user role, but admin permissions, or vice versa).</i> Firing a transition is
          changing your app from the current, valid state, to another valid state.
        </p>
      </div>
    </div>
  )
}
