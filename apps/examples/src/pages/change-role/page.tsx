import { Spinner } from "@blueprintjs/core"
import { fetchRole } from "./fn/fetch-role"
import { newStoreDef } from "saphyra"
import { useCallback, useEffect, useState } from "react"
import { ErrorPage } from "~/components/error-page"
import { fetchPermissions } from "~/pages/change-role/fn/get-permissions"
import { Devtools } from "~/devtools/devtools"
import { cn } from "~/lib/cn"
import { TextChart } from "~/components/text-chart"
import { CodeEditor } from "~/components/code-editor"
import { removeCurrentToastsAndRegisterNewToasts } from "./fn/removeCurrentToastsAndRegisterNewToasts"
import { toastWithResult } from "./fn/toast-with-result"
import { createStoreUtils, useBootstrapError, useHistory } from "saphyra/react"
import { Waterfall } from "~/devtools/waterfall"

export type SelectedRole = "user" | "admin"

type AuthStoreState = {
  role: "user" | "admin"
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
  { [K: string]: any[] },
  { vitor: "markis" }
>({
  config: {
    onPushToHistory({ history, state, transition }) {
      if (!!transition) return [state]
      return [...history, state]
    },
  },
  reducer({ prevState, state, action, diff, set, async, events, optimistic }) {
    if (action?.type === "change-role") {
      optimistic({ role: action.role })
      async()
        .setName("role-request")
        .promise(async ({ signal }) => {
          const role = await fetchRole({ roleName: action.role, signal })
          events.emit("got-role", role)
          set({ role })
        })
    }

    if (prevState.role !== state.role) {
      async()
        .setName("fetch-permissions")
        .promise(async ({ signal }) => {
          const permissions = await fetchPermissions({
            role: state.role,
            signal,
          })
          events.emit("got-permissions", permissions)
          set({ $permissions: permissions })
        })
    }

    set(s =>
      s.$permissions != null ? { $firstPermission: s.$permissions[0] } : s
    )

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
    () => newAuthStore({ role: "user", username: "" }, { name: "AuthStore" }),
    []
  )
  const authStoreState = useState(instantiateStore)
  const [authStore] = authStoreState
  const isBootstraping = Auth.useTransition(["bootstrap"], authStore)
  const [error, tryAgain] = useBootstrapError(authStoreState, instantiateStore)

  // Auth.useErrorHandlers(toastWithSonner, authStore)

  useHistory(authStore)

  useEffect(() => {
    Object.assign(window, { authStore })
  }, [authStore])

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
    <Auth.Context.Provider value={authStoreState}>
      <ChangeRolePageContent />
    </Auth.Context.Provider>
  )
}

function ChangeRolePageContent() {
  const [authStore] = Auth.useStore()
  const state = Auth.useCommittedSelector()
  const optimisticRole = Auth.useSelector(s => s.role)

  const isChangingRole = Auth.useTransition(["auth", "role"])

  useHistory(authStore)

  return (
    <div
      className={cn(`
      gap-4 h-full
      grid grid-cols-1 grid-rows-[auto,auto,auto] 
      @xl:grid-cols-[1fr,1fr] @xl:grid-rows-[auto,1fr]
    `)}
    >
      <TextChart.Wrapper className="h-fit min-w-0">
        <TextChart.Title>What is a transition?</TextChart.Title>
        <TextChart.Text>
          When dispatching an action, it might trigger asynchronous operations.
          Passing a <TextChart.Italic>'transition'</TextChart.Italic> property
          to your action makes{" "}
          <TextChart.Strong>
            all async operations initiated by this action get grouped under the
            same transition label
          </TextChart.Strong>
          .
          <br />
          <br />
          This allow you to{" "}
          <TextChart.Strong>
            derive loadings states effortlessly
          </TextChart.Strong>{" "}
          by simply subscribing to the transitions you want using hooks!
          <CodeEditor
            wrapperClassName="my-2 block"
            value='const isLoading = useTransition(["auth", "role"])'
          />
          For callbacks you have access to{" "}
          <TextChart.Italic>'transitionStore'</TextChart.Italic> where you can
          interact with the transitions, check if a transition is running,
          append callbacks for when a transition is done, and much more!
          <br />
          <br />
        </TextChart.Text>
      </TextChart.Wrapper>
      <TextChart.Wrapper className="h-fit">
        <TextChart.Title>Page example:</TextChart.Title>
        <TextChart.Text>
          Here is an example, changing roles works like a transaction. It
          fetches the role, and based on the role info, fetches the permissions.
          If one of the requests fails, all changes made by the async operation{" "}
          <TextChart.Strong>are discarded</TextChart.Strong> and{" "}
          <TextChart.Strong>no changes are applied</TextChart.Strong>.
          <br />
          <br />
          It's designed this way to prevent your store state from ending up in
          an invalid state{" "}
          <TextChart.Italic>
            (e.g: a user role with admin permissions, or vice versa).
          </TextChart.Italic>{" "}
          <TextChart.Important>
            Firing a transition means changing your app from one valid state to
            another valid state.
          </TextChart.Important>
        </TextChart.Text>
      </TextChart.Wrapper>
      {/* <div className="flex gap-8 h-full"> */}
      <div className="h-full pt-4 pl-4 grid grid-rows-[auto,1fr] gap-4">
        <div className="gap-6 h-fit grid grid-cols-[auto,1fr]">
          <label className="grid grid-cols-subgrid col-span-2 relative gap-2">
            <div className="top-0 left-0 right-0 absolute h-[1px] bg-white/10 -translate-y-3"></div>
            <strong className="text-right">Username</strong>
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
          </label>
          <label className="grid grid-cols-subgrid col-span-2 relative gap-2">
            <div className="top-0 left-0 right-0 absolute h-[1px] bg-white/10 -translate-y-3"></div>
            <strong className="text-right">Role</strong>

            <select
              name=""
              id=""
              value={optimisticRole}
              className={cn(
                "disabled:opacity-30 disabled:cursor-not-allowed"
                // isChangingRole && "opacity-30"
              )}
              onChange={e => {
                const selectedRole = e.target.value as "user" | "admin"
                authStore.dispatch({
                  type: "change-role",
                  role: selectedRole,
                  transition: ["auth", "role"],
                  beforeDispatch: removeCurrentToastsAndRegisterNewToasts,
                  onTransitionEnd: toastWithResult,
                })
              }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        {isChangingRole ? (
          <div className="grid place-items-center w-full h-full">
            <div className="flex items-center gap-4">
              <span className="tracking-wide text-xl">Transiting...</span>
              <Spinner size={24} />
            </div>
          </div>
        ) : null}
      </div>
      <pre>{JSON.stringify(state, null, 2)}</pre>
      {/* <div className="h-full grid grid-cols-1 gap-2 min-w-0">
        <Devtools
          store={authStore}
          allExpanded
        />
        <Waterfall store={authStore} />
      </div> */}
      {/* </div> */}
    </div>
  )
}
