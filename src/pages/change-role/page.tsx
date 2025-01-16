import { Spinner } from "@blueprintjs/core"
import { createStoreFactory } from "../../create-store"
import { createStoreUtils } from "../../createStoreUtils"
import { cn } from "../../lib/utils"
import { fetchRole } from "./fn/fetch-role"
import { PERMISSIONS } from "./const"
import { RemoveDollarSignProps } from "../../types"
import { fetchPermissions } from "~/fetchPermissions"
import { useHistory } from "~/hooks/use-history"

type SelectedRole = "user" | "admin"

type AuthStoreState = {
  role: "user" | "admin"
  permissions: string[]
  currentTransition: any[] | null
  username: string
  $welcomeMessage: string
  $firstPermission: string
}

type AuthStoreActions = ChangeRole
type ChangeRole = {
  type: "change-role"
  role: SelectedRole
}

const createAuthStore = createStoreFactory<
  RemoveDollarSignProps<AuthStoreState>,
  AuthStoreState,
  AuthStoreActions,
  { vitor: [name: "markis"] }
>({
  reducer({ prevState, state, action, diff, set, async }) {
    if (action?.type === "change-role") {
      async.promise(fetchRole({ roleName: action.role }), (role, actor) => {
        actor.set(() => ({ role }))
      })
    }

    if (prevState.role !== state.role) {
      async.promise(fetchPermissions({ role: state.role }), (permissions, actor) => {
        actor.set(() => ({ permissions }))
      })
    }

    set(s => ({ $firstPermission: s.permissions[0] }))

    if (diff(["username", "role"])) {
      set(s => ({ $welcomeMessage: `Welcome ${s.username}! Your role is [${s.role}].` }))
    }

    return state
  },
})

const authStore = createAuthStore({
  role: "user",
  permissions: PERMISSIONS()["user"],
  currentTransition: null,
  username: "",
})
Object.assign(window, { authStore })

export const Auth = createStoreUtils<typeof createAuthStore>(authStore)

export function ChangeRolePage() {
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
            authStore.setState({ username: value })
          }}
        />
        <select
          name=""
          id=""
          value={state.role}
          disabled={isChangingRole}
          className={cn("disabled:opacity-30 disabled:cursor-not-allowed", isChangingRole && "opacity-30")}
          onChange={e => {
            const selectedRole = e.target.value as "user" | "admin"
            authStore.dispatch({
              type: "change-role",
              role: selectedRole,
              transition: ["auth", "role"],
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
          Changing role is a transaction. It fetches the role, and based on the role info, fetch the permissions. If one
          of the requests fails, the transaction is <strong>rolled back</strong> and the{" "}
          <strong>no changes are made</strong>.
          <br />
          <br />
          It is made this way to prevent your store state to end up in a invalid state{" "}
          <i>(e.g: user role, but admin permissions, or vice versa).</i> Firing a transition is changing your app from
          the current, valid state, to another valid state.
        </p>
      </div>
    </div>
  )
}
