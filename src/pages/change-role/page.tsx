import { Spinner } from "@blueprintjs/core"
import { createStoreFactory } from "../../create-store"
import { createStoreUtils } from "../../createStoreUtils"
import { cn } from "../../lib/utils"
import { fetchRole } from "./fn/fetch-role"
import { getPermissions } from "./fn/get-permissions"
import { PERMISSIONS } from "./const"

type SelectedRole = "user" | "admin"

type AuthStoreInitialProps = {
  role: "user" | "admin"
  permissions: string[]
  currentTransition: any[] | null
}

type AuthStoreActions = ChangeRole
type ChangeRole = {
  type: "change-role"
  role: SelectedRole
}

const createAuthStore = createStoreFactory<AuthStoreInitialProps, AuthStoreInitialProps, AuthStoreActions>({
  reducer({ prevState, state, action, async, set }) {
    if (action?.type === "change-role") {
      async.promise(fetchRole({ roleName: action.role }), role => ({ role }))
    }

    if (prevState.role !== state.role) {
      async.promise(getPermissions({ role: state.role }), permissions => ({ permissions }))
    }

    return state
  },
})

const authStore = createAuthStore({
  role: "user",
  permissions: PERMISSIONS()["user"],
  currentTransition: null,
})

const Auth = createStoreUtils<typeof createAuthStore>(authStore)

export function ChangeRolePage() {
  const state = Auth.useStore()
  const isChangingRole = Auth.useTransition(["auth", "role"])

  return (
    <div className="">
      <div className="flex items-center gap-2">
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

      <pre className={cn("disabled:opacity-30 disabled:cursor-not-allowed", isChangingRole && "opacity-30")}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  )
}
