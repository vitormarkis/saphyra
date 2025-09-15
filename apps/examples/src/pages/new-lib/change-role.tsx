import { fetchRole } from "../change-role/fn/fetch-role"
import { fetchPermissions } from "../change-role/fn/get-permissions"

export type SelectedRole = "user" | "admin"

type Events = {
  changeRole: [desiredRole: SelectedRole]
  roleChanged: [role: SelectedRole]
  gotNewPermissions: [permissions: Permission[]]
  changeUsername: [username: string]
}

type Permission = string

type State = {
  role: "user" | "admin"
  username: string
  $permissions: Permission[]
}

const [emitChangeRole, onChangeRole] = createEvent()
const [emitNewPermissions, onNewPermissions] = createEvent()
const [emitUsername, onUsername] = createEvent()
const [emitRoleChanged, onRoleChanged] = createEvent()

onRoleChanged.run((role, reducerProps) => {
  const { async } = reducerProps
  async()
    .setName("fetch-permissions")
    .promise(async ({ signal }) => {
      const permissions = await fetchPermissions({
        role,
        signal,
      })
      emitNewPermissions(permissions)
    })
})

export const store = newStore<Events>({
  state: {
    role: createSubject(
      "user",
      onChangeRole(role => () => role)
    ),
    permissions: createSubject(
      [] as Permission[],
      onNewPermissions(permissions => () => permissions)
    ),
    username: createSubject(
      "vitor",
      onUsername(username => () => username)
    ).reducer((prevName, name) => {
      if (name.length > 30) return prevName
      return name
    }),
  },
  selectors: {
    firstPermission: createSelector(
      [s => s.permissions],
      permissions => permissions[0]
    ),
    welcomeMessage: createSelector(
      [s => s.username, s => s.role],
      (username, role) => `Welcome ${username}! Your role is [${role}].`
    ),
  },
  diff: [
    {
      on: s => s.role,
      run: (role, { emit }) => emit.roleChanged(role),
    },
  ],
})

export function NewLibPage() {
  return <div className="flex gap-6">vitor</div>
}
