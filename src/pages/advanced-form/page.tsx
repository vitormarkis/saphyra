import { Spinner } from "@blueprintjs/core"
import { useCallback, useState } from "react"
import { ErrorPage } from "~/components/error-page"
import { useBootstrapError } from "~/create-store/hooks/use-bootstrap-error"
import { newStoreDef } from "~/create-store/store"
import { createStoreUtils } from "../../create-store/createStoreUtils"

type AdvancedFormStoreState = {
  $payload: Record<string, any>
}

type AdvancedFormStoreActions = {
  type: "set-payload"
}

const newAdvancedForm = newStoreDef<
  AdvancedFormStoreState,
  AdvancedFormStoreState,
  AdvancedFormStoreActions
>({
  reducer({ state }) {
    return state
  },
})

export const AdvancedForm = createStoreUtils<typeof newAdvancedForm>()

export function AdvancedFormPage() {
  const instantiateStore = useCallback(() => newAdvancedForm({}), [])
  const advancedFormStoreState = useState(instantiateStore)
  const [advancedFormStore] = advancedFormStoreState
  const isBootstraping = AdvancedForm.useTransition(
    ["bootstrap"],
    advancedFormStore
  )
  const [error, tryAgain] = useBootstrapError(
    advancedFormStoreState,
    instantiateStore
  )

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
    <AdvancedForm.Provider value={advancedFormStoreState}>
      <Content />
    </AdvancedForm.Provider>
  )
}

function Content() {
  return (
    <form action="">
      <input type="text" />
      <button>Submit</button>
    </form>
  )
}
