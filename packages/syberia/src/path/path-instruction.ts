export type PathInstruction =
  | { type: "prop"; name: string }
  | { type: "find"; key: string; value: string | number }
  | { type: "index"; value: number }

export function resolvePath(state: any, instructions: PathInstruction[]): any {
  let current = state
  const path: (string | number)[] = []

  for (const inst of instructions) {
    if (inst.type === "prop") {
      path.push(inst.name)
      current = current?.[inst.name]
    } else if (inst.type === "find") {
      if (!Array.isArray(current)) {
        throw new Error(
          `Cannot find by key "${inst.key}" in non-array at path ${path.join(".")}`
        )
      }
      const idx = current.findIndex(
        (item: any) => item[inst.key] === inst.value
      )
      if (idx === -1) {
        throw new Error(
          `Item with ${inst.key}="${inst.value}" not found at path ${path.join(".")}`
        )
      }
      path.push(idx)
      current = current[idx]
    } else if (inst.type === "index") {
      path.push(inst.value)
      current = current?.[inst.value]
    }
  }

  return { value: current, path }
}

export function setPath(
  state: any,
  instructions: PathInstruction[],
  value: any
): any {
  if (instructions.length === 0) return value

  const [first, ...rest] = instructions
  const newState = Array.isArray(state) ? [...state] : { ...state }

  if (first.type === "prop") {
    newState[first.name] = rest.length > 0 ? setPath(state[first.name], rest, value) : value
  } else if (first.type === "find") {
    if (!Array.isArray(state)) {
      throw new Error(`Cannot find by key in non-array`)
    }
    const idx = state.findIndex((item: any) => item[first.key] === first.value)
    if (idx === -1) {
      throw new Error(`Item with ${first.key}="${first.value}" not found`)
    }
    const newArray = [...state]
    newArray[idx] = rest.length > 0 ? setPath(state[idx], rest, value) : value
    return newArray
  } else if (first.type === "index") {
    if (!Array.isArray(state)) {
      throw new Error(`Cannot use index on non-array`)
    }
    const newArray = [...state]
    newArray[first.value] = rest.length > 0 ? setPath(state[first.value], rest, value) : value
    return newArray
  }

  return newState
}
