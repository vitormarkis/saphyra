import { defaultRenderer } from "./default-renderer"
import { ChildNode, Renderer } from "./types"

export type CheckIsObject = (item: unknown) => item is Record<string, any>

export function defaultCheckIsObject(
  item: unknown
): item is Record<string, any> {
  if (!item) return false
  return Object.getPrototypeOf(item) === Object.prototype
}

export interface JsonToNodeInterface {
  renderer: Renderer
  /**
   * By default, it only consider objects literals as objects,
   * but you can override this behavior to accept any object
   * types e.g class instances
   */
  checkIsObject?: CheckIsObject
}

export function createJsonToNode(
  {
    renderer = defaultRenderer,
    checkIsObject = defaultCheckIsObject,
  }: JsonToNodeInterface = {
    renderer: defaultRenderer,
    checkIsObject: defaultCheckIsObject,
  }
) {
  const getType = createGetType(checkIsObject)

  function getChildNodes(value: any, currentPath: string): ChildNode[] | null {
    if (Array.isArray(value)) {
      const nodes = value.flatMap((value, index) => {
        return jsonToNode(value, `${currentPath}.[${index}]`)
      })
      return nodes
    }
    if (checkIsObject(value)) return jsonToNode(value, currentPath)
    return null
  }

  function jsonToNode(state: any, path?: string): ChildNode[] {
    function generateNode(value: any, currentPath: string) {
      const node: ChildNode = {
        id: currentPath,
        label: currentPath,
        childNodes: getChildNodes(value, currentPath),
      }
      const key = getKey(currentPath)
      const type = getType(value)
      const isItem = currentPath.endsWith("]")
      const idx = isItem ? getIdx(key) : null
      return renderer({
        node,
        path: currentPath,
        value,
        key,
        type,
        isItem,
        idx,
      })
    }

    if (checkIsObject(state) || Array.isArray(state)) {
      const content = Object.entries(state).map(([key, value]) => {
        let currentPath = getPath(key, path, state)
        return generateNode(value, currentPath)
      })

      /**
       * If path ends with "]", it means that it is an index
       * of an array, which needs its own node in the tree
       *
       * If path does not include ".", it means that
       * it is the root node. If you pass an JSON array as the
       * entry source, you would not want a root node, sounds
       * like extra stuff
       *
       * Is better a hard coded if statement than millions of
       * extra props
       */

      const isInitialKey = !path?.includes(".")

      if (path?.endsWith("]") && !isInitialKey) {
        const node = {
          id: path,
          label: path,
          childNodes: content,
        }
        const key = getKey(path)
        const type = getType(state)
        const isItem = true
        const idx = isItem ? getIdx(key) : null
        return [
          renderer({
            node,
            path,
            value: state,
            key,
            type,
            isItem,
            idx,
          }),
        ]
      }

      return content
    }

    const node = {
      id: String(path),
      label: String(path),
    }
    const key = getKey(path)
    const type = getType(state)
    const isItem = path?.endsWith("]") ?? true
    const idx = isItem ? getIdx(key) : null
    return [
      renderer({
        node,
        path,
        value: state,
        key,
        type,
        isItem,
        idx,
      }),
    ]
  }

  return jsonToNode
}

function getPath(
  key: string,
  path: string | null | undefined,
  state: any
): string {
  if (path != null) {
    return `${path}.${key}`
  }

  if (Array.isArray(state)) {
    return `[${key}]`
  }

  return key
}

function getKey(path: string | undefined) {
  return String(path).split(".").pop()!
}

function getIdx(path: string) {
  return Number(path?.replace("[", "").replace("]", ""))
}

function createGetType(checkIsObject: CheckIsObject) {
  return function getType(value: unknown) {
    if (typeof value === "string") return "string"
    if (typeof value === "number") return "number"
    if (typeof value === "boolean") return "boolean"
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    if (checkIsObject(value)) return "object"
    if (value instanceof Date) return "date"
    return "object"
    // throw new Error(`Unknown type [${value}], please provide this one in the source code.`)
  }
}
