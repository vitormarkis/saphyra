import { useEffect, useState } from "react"

function App() {
  const [value, setValue] = useState(20)

  return (
    <>
      <div className="bg-rose-200">
        {value}
        <button
          onClick={() => {
            setValue(0)
          }}
        >
          Reset controlled to 0
        </button>
      </div>
      <div className="p-2 bg-green-200">
        <Timer
          value={value}
          onChange={setValue}
        />
      </div>
    </>
  )
}

type TimerProps = {
  value?: number
  onChange?: (value: number) => void
}

export function Timer({ onChange, ...props }: TimerProps) {
  const value_ext = props.value
  const [value_inn, setValue] = useState(value_ext ?? 0)
  const value = "value" in props ? value_ext : value_inn
  /**
   * Se foi passado a prop value, sempre usa value externo,
   * onChange vai setar o state do valor externo
   *
   * Ao mesmo tempo, mantém um estado interno para
   * componente ser independente
   *
   * Usa o setState para setar o valor, mas o setState
   * precisa ser custom, um wrapper em cima do setState
   * do useState, que roda o onChange junto, assim garante
   * que eles sempre estejam sincronizados
   */

  function increaseTimer() {
    const finalValue = value + 1
    setValue(finalValue)
    onChange?.(finalValue)
  }

  useEffect(() => {
    const timer = setInterval(increaseTimer, 1000)
    return () => clearInterval(timer)
  }, [value])

  return (
    <>
      <strong>Timer: </strong>
      <span>{value}</span>
    </>
  )
}

export default App
