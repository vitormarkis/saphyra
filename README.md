Se você está curioso por que eu decidi criar uma biblioteca de gerenciamento de estado mesmo sabendo que já existe uma infinidade no mercado, é porque essa biblioteca se baseia em cima de alguns bons princípios, os quais eu recomendo fortemente [a leitura aqui]().

### Promessa do XXX?
Aguentar stress testes. Tirar aquele aspecto de medo de usar a UI porque vai quebrar ou entrar em estado inválido.

### O que é XXX?
O XXX é uma biblioteca de gerenciamento de estado minimalista assim como Zustand, com uma abordagem declarativa. TL;DR: Zustand para stores imperativas, XXX para stores declarativas.

XXX não é tão simples como Zustand, e nem tão robusto como XState, ele fica entre os dois mais como uma caixa de ferramentas provendo primitivos para você criar sua store declarativa. Você pode vê-lo como um reducer com super poderes, resolvendo os problemas mais comuns de gerenciamento de estado e deixando você focar apenas na feature.

### Filosofia:
Acredito que o papel de criadores de bibliotecas e APIs no geral, seja de reduzir o custo técnico do usuário para conseguir chegar no resultado desejado mais rápido.

O Zustand é um exemplo de primitivo poderoso pra resolver problemas, mas uma feature é muito mais do que ter um objeto reativo na UI. 

Existe uma definição de boa abstração que sempre levo comigo, "abstrações que sequestram o problema, resolvem, e te dão uma API para interagir são abstrações que dificilmente escalam, ao passo que abstrações que te dão primitivos para você resolver o problema geralmente escalam melhor". Boas soluções são criadas em cima de boas abstrações.

Esse é um dos motivos pelo qual não consigo usar XState, porque ele sequestra o problema e expõe uma API específica, se você quer resolver o problema, precisa ser por meio da API deles. Você não sente que está escrevendo Javascript, e sim dando comandos para uma interface a fim de gerar uma store, que no fim também será uma interface que receberá comandos de usuários. 

Esse foi um dos meus aprendizados, se você sabe Javascript, você sabe XXX. Se por algum motivo algo der errado, você pode dar um passo para trás e escrever Javascript para resolver seu problema. Soluções customizadas é algo muito comum no dia a dia escrevendo software, e XXX abraça isso, por isso XXX é uma caixa de ferramentas que provê primitivos para ajudar você a resolver o problema, e não resolver o problema por você.

### Eu devo usar XXX?
Você precisa calcular qual o custo técnico para resolver o seu problema usando cada lib, e escolher a que melhor se adequa ao seu caso. Veja as funcionalidaes de XXX e se pergunte aonde esses primitivos te permitem chegar, e depois, como você conseguiria ter as mesmas funcionalidades usando sua stack atual.

Você é capaz de fazer tudo com qualquer coisa. Você pode gerenciar estado assíncrono com Zustand, mas você deveria fazer isso com React Query. Você pode armazenar suas regras dentro de um método e depois chamar o setState, mas você deveria usar reducers para isso. Você pode escrever sua feature de forma imperativa usando Zustand/setState, mas muito provavelmente você deveria escrever de forma declarativa usando XXX. Procure soluções especializadas, as quais reduzem o custo técnico para chegar na solução de forma mais rápida.



### Por que minha store deveria ser declarativa em vez de imperativa?

apesar da store ser framework agnostic, eu sou um dev React, e com bases nos problemas que enfrento no dia a dia, eu came up with XXX mental model, react é declarativo
... - setar state diretamente, pode levar estado invalido
... setar loading state



### Quando usar XXX?
- Quando sua store possui inteligência ou precisa de invariância, é momento de procurar uma abordagem com a Reducer API. Por exemplo, uma store que representa uma cor RGB, ela aceita 3 valores que precisam ir de 0 a 255. Essa regra precisa ser assegurada por meio de um reducer.
- Quando você percebe que uma entidade da sua store está sendo modifica, ou interessa a mais de um agente. Por exemplo, duas actions mudam a mesma variável, mas ela possui uma regra que deve ser seguida por ambas.
- Quando você precisa de invariância pública.
  - Invariância privada é quando você assegura alguma regra, dentro de um if (checagem se action é de um type específico), ou dentro de uma função/método, fazendo com que essa regra seja aplicada se essa action/função/método específica for chamada.
  - Invariância pública é quando você assegura essa regra antes de setar o estado, fazendo com que essa regra seja aplicada independente de quem foi o agente, ou por onde foi executada aquela ação.

### Quando não usar XXX?
- Quando você quer apenas um objeto reativo.
- Quando você prefere



### Qual problema XXX resolve?
- Apesar de usar selectors para ler os valores da store, XXX não tem como objetivo resolver problemas de performance e sim ser uma solução de gerenciamento de estado de forma declarativa.
- **Nunca mais escreva loading states**: XXX possui transitions, o que significa que toda ação assíncrona que você queira executar, gere um loading state o qual você pode se inscrever usando hooks.
- **Controle do ciclo de vida de uma feature**: Em outras soluções, é muito comum você precisar usar lib A para buscar iniciar o fetch de um dado, lib B para cachear o dado, lib C para gerenciar o estado... Você perde o rastreio de onde começa sua store, e onde ela termina. Com XXX, sua store começa no useState, e termina o no setState [reference]().
- **Baixo custo técnico para expandir:** Como toda interação com a store é feita por meio de eventos, qualquer child pode enviar qualquer evento, e outro child qualquer do outro lado do mundo pode registrar um listener para reagir.
- **Leituras O(1):** É incentivado que você derive valores dentro do reducer em vez de calcular em render, usando o prefixo $ (convenção), assim seus componentes apenas acessam o valor que eles precisam em vez de receberem os valores brutos e calcularem em render.
- **Cancelamento first class**: TODO
- **React Friendly**:


... - poucas estrutura para stores declarativas
... problemas comuns 
... - loading states (transitions)

### Filosofia:
Existe uma definição de boa abstração que sempre levo comigo, "abstrações que sequestram o problema, resolvem, e te dão uma API para interagir com o problema são abstrações ruins, ao passo que abstrações que te dão primitivos para você resolver o problema são abstrações boas". Boas soluções são criadas em cima de boas abstrações.

Esse é um dos motivos pelo qual não consigo usar XState, porque ele sequestra o problema e expõe uma API específica, se você quer resolver o problema, precisa ser por meio da API deles. Você não sente que está escrevendo Javascript, e sim dando comandos para uma interface a fim de gerar uma store, que no fim também será uma interface que receberá comandos de usuários.

O Zustand é um exemplo de primitivo poderoso pra resolver problemas, mas uma feature é muito mais do que ter um objeto reativo na UI.

### Funcionalidade out of the box/first class support
Reducer API +
- transitions
- devtools
- undo/redo (historico)
- error handling
- async state management
- states (WIP)

### Quando usar XXX?

### Por que transitions em vez de métodos assíncronos?
- timers
- promises derivadas, devem ser escritas 1 vez, dado um cenário. Nao devem derivar em métodos
- um método é um escopo fechado, voce pressupoe que tudo o que vai acontecer estará dentro dele, mas a gente tem casos como o do "change-role" onde ao mudanca de rola, cascateia outra operacao assincrona buscando permissions, e isso voce so consegue visualizar com um reducer
- 

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
const createSimpleForm = newStoreDef()

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
const createSimpleForm = newStoreDef(options)
```
Aqui você cria uma factory de stores em vez de um store direto. Isso facilita ter controle do ciclo de vida da store, você pode criar quantas quiser, de forma global, dentro de componentes, em testes... (no exemplo ele está sendo declarado de forma global).

Você pode passar options como argumento, o qual é usado para ditar como a store deve se comportar, é lá que você pode controlar sua store, com callbacks que rodam na construção da store (onConstruct), ou callbacks que rodam antes de setar estado (reducer), e outras configurações.

```js
// second extra line
const SimpleForm = createStoreUtils(simpleForm)
```
Aqui é criado uma séria de utilidades para facilitar o consumo dessa store, como Context Provider caso você queira usar em componentes escopados, Devtools para você conseguir debugar o estado de sua store, hooks para acessar o estado da store (com selectors), transitions, e acessar a store provida pelo contexto.

### Exemplo completo usando as principais funcionalidades:
```js
const createSimpleForm = newStoreDef({
  onConstruct({ initialProps }) {
    const [name, surname] = initialProps.fullName.split(" ")

    return {
      name,
      surname,
      email: `${name}@${surname}.com`.toLowerCase()
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
  }
})

const SimpleForm = createStoreUtils()
```


#### React:
```jsx
export function SimpleFormPage() {
  const simpleFormState = useState(() =>
    createSimpleForm({
      fullName: "Vitor Markis"
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

