### O que é XXX?

O XXX é uma biblioteca de gerenciamento de estado minimalista assim como Zustand, com uma abordagem declarativa. TLDR: Zustand para stores imperativas, XXX para stores declarativas.

XXX não é tão simples como Zustand, e nem tão robusto como XState, ele fica entre os dois mais como uma caixa de ferramentas provendo primitivos para você criar sua store declarativa.

### Funcionalidade out of the box/first class support

Reducer API +

- transitions
- devtools
- undo/redo (historico)
- error handling
- async state management
- states (WIP)

### Eu devo usar XXX?

apesar da store ser framework agnostic, eu sou um dev React, e com bases nos problemas que enfrento no dia a dia, eu came up with XXX mental model, react é declarativo
... - setar state diretamente, pode levar estado invalido
... setar loading state

### Quando usar XXX?

Se você possui uma feature não tão complexa, criar uma store imperativa pode ser uma boa opção além de ser mais rápida de escrever. Porém esse são alguns pontos que eu levo em consideração:

- Quando sua store possui inteligência ou precisa de invariância, é momento de procurar uma abordagem com a Reducer API. Por exemplo, uma store que representa uma cor RGB, ela aceita 3 valores que precisam ir de 0 a 255. Essa regra precisa ser assegurada por meio de um reducer.
- Quando você percebe que uma entidade da sua store está sendo modifica, ou interessa a mais de um agente. Por exemplo, duas actions mutam a mesma variável, mas ela possui uma regra que deve ser seguida por ambas.

### Qual problema XXX resolve?

... nao tem como objetivo, resolve problema de performance
... - poucas estrutura para stores declarativas
... problemas comuns
... - loading states (transitions)

### Quando usar XXX?

### Como XXX se parece?

```js
// Simple form store using Zustand
const useSimpleForm = create(set => ({
  email: "",
  surname: "",
  email: "",
}))
```

```js
// Simple form store using XXX
const createSimpleForm = createStoreFactory()

const simpleForm = createSimpleForm({
  name: "",
  surname: "",
  email: "",
})

const SimpleForm = createStoreUtils(simpleForm)
```

Perceba duas linhas a mais no approach de XXX:

```js
// first extra line
const createSimpleForm = createStoreFactory(options)
```

Aqui você cria uma factory de stores em vez de um store direto. Isso facilita ter controle do ciclo de vida da store, você pode criar quantas quiser, de forma global, dentro de componentes, em testes... (no exemplo ele está sendo declarado de forma global).

Você pode passar options como argumento, o qual é usado para ditar como a store deve se comportar, é lá que você pode controlar sua store, com callbacks que rodam na construção da store (onConstruct), ou callbacks que rodam antes de setar estado (reducer), e outras configurações.

```js
// second extra line
const SimpleForm = createStoreUtils(simpleForm)
```

Aqui é criado uma séria de utilidades para facilitar o consumo dessa store, como Context Provider caso você queira usar em componentes escopados, Devtools para você conseguir debugar o estado de sua store, hooks para acessar o estado da store (com selectors), tranisitions, e acessar a store provida pelo contexto.

### Exemplo completo usando as principais funcionalidades:

```js
const createSimpleForm = createStoreFactory({
  onConstruct({ initialProps }) {
    const [name, surname] = initialProps.fullName.split(" ")

    return {
      name,
      surname,
      email: `${name}@${surname}.com`.toLowerCase(),
    }
  },
  reducer({ prevState, state, action, diff, set, async, events }) {
    if (action.type === "submit") {
      async.promise(createSession(state), token => {
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
```

#### React:

```jsx
export function SimpleFormPage() {
  const simpleFormState = useState(() =>
    createSimpleForm({
      fullName: "Vitor Markis",
    })
  )

  return (
    <SimpleForm.Provider value={simpleFormState}>
      <SimpleFormView onGetToken={console.log} />
      <SimpleForm.Devtools />
    </SimpleForm.Provider>
  )
}

export function SimpleFormView({ onGetToken }) {
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
        simpleForm.dispatch({ type: "submit", transition: ["submit"] })
      }}
    >
      Hello {fullName}!
      <input
        type="text"
        value={name}
        onChange={e => simpleForm.setState({ name: e.target.value })}
      />
      <input
        type="text"
        value={surname}
        onChange={e => simpleForm.setState({ surname: e.target.value })}
      />
      <input
        type="email"
        value={email}
        onChange={e => simpleForm.setState({ email: e.target.value })}
      />
      <button>Submit</button>
    </form>
  )
}
```
