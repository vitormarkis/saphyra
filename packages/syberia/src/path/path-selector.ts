import type { PathInstruction } from "./path-instruction"
import { isKeyedWrapper } from "./keyed-wrapper"

export function createPathSelector<TState>(
  selector: (state: TState) => any
): PathInstruction[] {
  const instructions: PathInstruction[] = []
  const pathProxy = createPathProxy(instructions)

  try {
    selector(pathProxy as TState)
  } catch (e) {
    // Path extraction completed
  }

  return instructions
}

function createPathProxy(instructions: PathInstruction[]): any {
  return new Proxy(
    {},
    {
      get(_, prop: string | symbol) {
        if (prop === Symbol.toPrimitive) {
          return () => ""
        }

        const propStr = String(prop)

        // Check if prop is a KeyedWrapper token like "[id='123']"
        const tokenMatch = propStr.match(/^\[(\w+)='(.+)'\]$/)
        if (tokenMatch) {
          const [, keyName, keyValue] = tokenMatch
          instructions.push({
            type: "find",
            key: keyName,
            value: keyValue,
          })
          return createPathProxy(instructions)
        }

        // Regular property access
        instructions.push({ type: "prop", name: propStr })
        return createPathProxy(instructions)
      },
    }
  )
}

export function extractKeyPath(extractor: (item: any) => any): string[] {
  const path: string[] = []
  const recorder = new Proxy(
    {},
    {
      get(_, prop: string) {
        path.push(prop)
        return recorder
      },
    }
  )
  try {
    extractor(recorder)
  } catch (e) {
    // Path extraction completed
  }
  return path
}
