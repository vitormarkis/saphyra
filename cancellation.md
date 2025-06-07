## Como cancelar uma transition?
Para qualquer ação, poderá ser passado um abort controller, o qual é passado por quem da o dispatch na ação. O abort controller ser passado por quem chama da liberdade do usuário cancelar a transition quando quiser.
```jsx
function App() {
  const abortController = useRef(new AbortController())

  return (
    <button
      onClick={() => {
        const abortController = new AbortController()
        store.dispatch({
          type: "submit",
          abortController: abortController.current
        })
      }}
    >
      Submit
    </button>
  )
}
```

### Dentro do reducer
Toda ação assíncrona executada dentro do reducer precisa ser feita através do módulo 'async' se você quiser que ela faça parte da transition vigente. O módulo 'async' passa o abort controller da action para o módulo 'async', o qual você pode acessar dentro dos métodos 'promise' e 'timer' para cancelar efeitos colaterais que você aplicou.
```js
reducer({ async }) {
  async().promise(async (abortController) => {
    const response = await fetch(..., {
      signal: abortController?.signal
    })
    const data = await response.json()
    return data
  }, () => {})
}
```

Se você quiser aproveitar o abort controller do 'async' para cancelar efeitos colaterais que não fazem parte da transition vigente, apenas não retorne a promise.
```js
reducer({ async }) {
  async().promise((abortController) => {
    // don't return the promise below
    runAnotherPromise(abortController?.signal)
  }, () => {})
}
```