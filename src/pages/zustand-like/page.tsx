import { createStoreFactory } from "../../create-store"
import { createStoreUtils } from "../../createStoreUtils"

type SimpleForm = {
  name: string
  email: string
  password: string
}

const simpleFormStore = createStoreFactory<SimpleForm>()

const simpleForm = simpleFormStore({
  email: "",
  name: "",
  password: "",
})
const SimpleForm = createStoreUtils<typeof simpleFormStore>(simpleForm)
const useSimpleForm = SimpleForm.useStore

export function ZustandLikePage() {
  return (
    <div className="flex gap-6">
      <form
        action=""
        className="flex-1 flex flex-col gap-2"
        onSubmit={e => e.preventDefault()}
      >
        <InputName />
        <InputEmail />
        <InputPassword />
        <button>Submit</button>
      </form>
      <div className="flex-1">
        <StateDisplay />
      </div>
    </div>
  )
}

type InputNameProps = {}

export function InputName({}: InputNameProps) {
  const name = useSimpleForm(s => s.name)
  return (
    <input
      type="text"
      placeholder="Name"
      value={name}
      onChange={e => simpleForm.setState({ name: e.target.value })}
    />
  )
}

type InputEmailProps = {}

export function InputEmail({}: InputEmailProps) {
  const email = useSimpleForm(s => s.email)
  return (
    <input
      type="text"
      placeholder="Email"
      value={email}
      onChange={e => simpleForm.setState({ email: e.target.value })}
    />
  )
}

type InputPasswordProps = {}

export function InputPassword({}: InputPasswordProps) {
  const password = useSimpleForm(s => s.password)
  return (
    <input
      type="text"
      placeholder="Password"
      value={password}
      onChange={e => simpleForm.setState({ password: e.target.value })}
    />
  )
}

const valuesToWatch = ["name", "email", "password"]

export function StateDisplay() {
  return valuesToWatch.map(key => (
    <ValueDislayer
      key={key}
      valueName={key}
    />
  ))
}

type ValueDislayerProps = {
  valueName: string
}

export function ValueDislayer({ valueName }: ValueDislayerProps) {
  const value: string = useSimpleForm(s => s[valueName])

  return (
    <div className="flex gap-2">
      <strong>{valueName}</strong>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
