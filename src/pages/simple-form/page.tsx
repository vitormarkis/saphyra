import { useEffect, useState } from "react"
import { newStoreDef } from "~/create-store/store"
import { BaseState } from "~/create-store/types"
import { createStoreUtils } from "~/create-store/createStoreUtils"
import { createSession } from "~/pages/zustand-like/fn/create-session"

type SimpleFormEvents = {
  "got-token": [token: string]
}

type SimpleFormActions = {
  type: "submit"
}

type SimpleFormInitialProps = {
  fullName: string
}

type SimpleFormState = BaseState & {
  name: string
  surname: string
  email: string
}

const newSimpleForm = newStoreDef<
  SimpleFormInitialProps,
  SimpleFormState,
  SimpleFormActions,
  SimpleFormEvents
>({
  onConstruct({ initialProps }) {
    const [name, surname] = initialProps.fullName.split(" ")

    return {
      name,
      surname,
      email: `${name}@${surname}.com`.toLowerCase(),
      currentTransition: null,
    }
  },
  reducer({ prevState, state, action, async, events }) {
    if (action.type === "submit") {
      async
        .promise(ctx => createSession(state, ctx.signal))
        .onSuccess(token => {
          events.emit("got-token", token)
        })
    }

    return state
  },
})

const SimpleForm = createStoreUtils<typeof newSimpleForm>()

export function SimpleFormPage() {
  const simpleFormState = useState(() =>
    newSimpleForm({ fullName: "Vitor Markis" })
  )

  return (
    <SimpleForm.Provider value={simpleFormState}>
      <SimpleFormView
        onGetToken={token => {
          console.log("New token! ", JSON.stringify(token))
        }}
      />
    </SimpleForm.Provider>
  )
}

type SimpleFormViewProps = {
  onGetToken: (token: string) => void
}

export function SimpleFormView({ onGetToken }: SimpleFormViewProps) {
  const [simpleForm] = SimpleForm.useUseState()
  const name = SimpleForm.useStore(s => s.name)
  const surname = SimpleForm.useStore(s => s.surname)
  const email = SimpleForm.useStore(s => s.email)

  useEffect(() => {
    const unsub = simpleForm.events.on("got-token", token => {
      onGetToken(token)
    })
    return () => void unsub()
  }, [simpleForm])

  return (
    <form
      action=""
      onSubmit={e => {
        e.preventDefault()
        simpleForm.dispatch({
          type: "submit",
        })
      }}
      className="flex flex-col gap-2"
    >
      <input
        placeholder="name"
        value={name}
        onChange={e =>
          simpleForm.setState({
            name: e.target.value,
          })
        }
      />
      <input
        placeholder="surname"
        value={surname}
        onChange={e =>
          simpleForm.setState({
            surname: e.target.value,
          })
        }
      />
      <input
        placeholder="email"
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
