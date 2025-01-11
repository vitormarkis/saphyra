import { ReactNode } from "react"

export type ChildNode = {
  id: string
  label: ReactNode
  childNodes?: ChildNode[] | null
}

export type RendererContext = {
  path?: string
  node: ChildNode
  value: any
  key: string
  type: "object" | "array" | "boolean" | "null" | "number" | "string" | "date"
  isItem: boolean
  idx: number | null
}

export type Renderer = (context: RendererContext) => ChildNode
