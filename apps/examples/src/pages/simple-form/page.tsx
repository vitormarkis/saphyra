import { createStoreUtils, useNewStore } from "saphyra/react"
import { useEffect, useState } from "react"
import { newStoreDef } from "saphyra"
import { createSession } from "~/pages/zustand-like/fn/create-session"
import { Button } from "~/components/ui/button"

type SimpleFormEvents = {
  "got-token": [token: string]
}

type SimpleFormActions = {
  type: "submit"
}

type SimpleFormInitialProps = {
  fullName: string
}

type SimpleFormState = {
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
      async().promise(async ctx => {
        const token = await createSession(state, ctx.signal)
        events.emit("got-token", token)
      })
    }

    return state
  },
})

const SimpleForm = createStoreUtils<typeof newSimpleForm>()

export function SimpleFormPage() {
  const [simpleForm, resetStore, isLoading] = useNewStore(() =>
    newSimpleForm({ fullName: "Vitor Markis" })
  )

  return (
    <SimpleForm.Context.Provider value={[simpleForm, resetStore, isLoading]}>
      <SimpleFormView
        onGetToken={token => {
          console.log("New token! ", JSON.stringify(token))
        }}
      />
    </SimpleForm.Context.Provider>
  )
}

type SimpleFormViewProps = {
  onGetToken: (token: string) => void
}

export function SimpleFormView({ onGetToken }: SimpleFormViewProps) {
  const [simpleForm] = SimpleForm.useStore()
  const name = SimpleForm.useCommittedSelector(s => s.name)
  const surname = SimpleForm.useCommittedSelector(s => s.surname)
  const email = SimpleForm.useCommittedSelector(s => s.email)

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
      <Button>Submit</Button>
    </form>
  )
}
