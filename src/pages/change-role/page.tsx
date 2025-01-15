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
  reducer({ prevState, state, action, async, set, diff }) {
    if (action?.type === "change-role") {
      const promise = fetchRole({ roleName: action.role })
      async.promise(promise, (role, actor) => {
        actor.set(() => ({ role }))
      })
    }

    if (prevState.role !== state.role) {
      const promise = fetchPermissions({ role: state.role })
      async.promise(promise, (permissions, actor) => {
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

  // Auth.useErrorHandlers(error => {
  //   toast.error(error.message, {
  //     className: "bg-red-500 text-white",
  //   })
  // })

  useHistory(authStore)

  return (
    <div className="">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={state.username}
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
      <Auth.Devtools />
    </div>
  )
}
