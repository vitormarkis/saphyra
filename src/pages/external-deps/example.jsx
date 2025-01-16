function useTodos({ children }) {
  const todos = []

  const uncompletedTodos = useMemo(
    () => todos.filter((todo) => !todo.completed),
    [todos]
  )

  return (
    <TodosProvider value={{ todos, uncompletedTodos }}>
      {children}
    </TodosProvider>
  )
}

function Parent() {
  return (
    <div>
      <Header />
      <UncompletedTodos />
      <UncompletedTodos />
      <UncompletedTodos />
      <UncompletedTodos />
      <UncompletedTodos />
      <UncompletedTodos />
    </div>
  )
}

function Header() {
  const { uncompletedTodos } = useTodos()

  return <h1>Todos {uncompletedTodos.length}</h1>
}

function UncompletedTodos() {
  const { uncompletedTodos } = useTodos()

  return uncompletedTodos.map((todo) => (
    <Todo todo={todo} />
  ))
}
