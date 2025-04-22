import { Spinner } from "@blueprintjs/core"
import { useEffect, useState } from "react"
import { newStoreDef } from "~/create-store/store"
import { createStoreUtils } from "~/create-store/createStoreUtils"
import { createSession } from "~/pages/zustand-like/fn/create-session"
import { Devtools } from "~/devtools/devtools"

type SimpleFormInitialProps = {
  fullName: string
}

type SimpleFormState = {
  name: string
  surname: string
  email: string
  $fullName: string
}

const createSimpleForm = newStoreDef<SimpleFormInitialProps, SimpleFormState>({
  onConstruct({ initialProps }) {
    const [name, surname] = initialProps.fullName.split(" ")

    return {
      name,
      surname,
      email: `${name}@${surname}.com`.toLowerCase(),
      currentTransition: null, // REMOVE
    }
  },
  reducer({ prevState, state, action, diff, set, async, events }) {
    if (action.type === "submit") {
      async.promise(async ctx => {
        const token = await createSession(state, ctx.signal)
        events.emit("got-token", token)
      })
    }

    if (diff(["name", "surname"])) {
      set(s => ({ $fullName: `${s.name} ${s.surname}` }))
    }

    if (state.$fullName.length > 30) {
      return prevState
    }

    return state
  },
})

const SimpleForm = createStoreUtils()

export function SimpleFormPage() {
  const simpleFormState = useState(() =>
    createSimpleForm({
      fullName: "Vitor Markis",
    })
  )
  const [simpleForm] = simpleFormState

  return (
    <SimpleForm.Provider value={simpleFormState}>
      <SimpleFormView onGetToken={console.log} />
      <Devtools store={simpleForm} />
    </SimpleForm.Provider>
  )
}

type SimpleFormViewProps = {
  onGetToken: (token: string) => void
}

export function SimpleFormView({ onGetToken }: SimpleFormViewProps) {
  const [simpleForm] = SimpleForm.useUseState()
  const isSubmitting = SimpleForm.useTransition(["submit"])

  const name = SimpleForm.useStore(s => s.name)
  const surname = SimpleForm.useStore(s => s.surname)
  const email = SimpleForm.useStore(s => s.email)

  const fullName = SimpleForm.useStore(s => s.$fullName)

  useEffect(() => {
    const unsub = simpleForm.events.on("got-token", onGetToken)
    return () => void unsub()
  }, [simpleForm])

  if (isSubmitting) {
    return <Spinner />
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        simpleForm.dispatch({
          type: "submit",
          transition: ["submit"],
        })
      }}
    >
      Hello {fullName}!
      <input
        type="text"
        value={name}
        onChange={e =>
          simpleForm.setState({
            name: e.target.value,
          })
        }
      />
      <input
        type="text"
        value={surname}
        onChange={e =>
          simpleForm.setState({
            surname: e.target.value,
          })
        }
      />
      <input
        type="email"
        value={email}
        onChange={e =>
          simpleForm.setState({
            email: e.target.value,
          })
        }
      />
      <button>Submit</button>
    </form>
  )
}
