function App() {
  const [store] = useState(() => newStoreDef())
  const handle = () => {
    store.dispatch({
      type: "increment",
      transition: ["increment"],
      beforeDispatch({ transition, transitionStore, action }) {
        const queue = transitionStore.queue.get(transition)
        queue.push(action)
      },
      onTransitionEnd({ transition, transitionStore }) {
        const queue = transitionStore.queue.get(transition)
        if (queue.length > 0) {
          const action = queue.shift()
          store.dispatch(action)
        }
      },
    })
  }
}
