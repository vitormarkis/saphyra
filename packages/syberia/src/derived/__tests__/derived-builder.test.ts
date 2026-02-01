import { describe, it, expect } from "vitest"
import { DerivedBuilder, isFromEachDefinition } from "../derived-builder"

type TestState = {
  count: number
  $doubled: number
  query: string
  $results: any
  data: { foo: any; bar: any }
  foo: any
  bar: any
  items: { id: string }[]
}

describe("DerivedBuilder", () => {
  it("should build simple sync derived definition", () => {
    const d = new DerivedBuilder<TestState>()
    const def = d
      .deps([s => s.count])
      .target(s => s.$doubled)
      .get(count => count * 2)

    expect(def.type).toBe("sync")
    expect(def.pattern).toBe("declarative")
    expect(def.deps).toHaveLength(1)
    expect(def.targetPath).toBeDefined()
  })

  it("should build async derived definition", () => {
    const d = new DerivedBuilder<TestState>()
    const def = d
      .deps([s => s.query])
      .target(s => s.$results)
      .getAsync(query => async ({ signal }) => {
        return await fetch(`/api?q=${query}`, { signal })
      })

    expect(def.type).toBe("async")
    expect(def.pattern).toBe("declarative")
  })

  it("should build imperative pattern with targets", () => {
    const d = new DerivedBuilder<TestState>()
    const def = d
      .deps([s => s.data])
      .targets({
        setFoo: s => s.foo,
        setBar: s => s.bar,
      })
      .run(data => ({ setFoo, setBar }) => {
        setFoo(data.foo)
        setBar(data.bar)
      })

    expect(def.type).toBe("sync")
    expect(def.pattern).toBe("imperative")
    expect(def.targetPaths).toBeDefined()
    expect(Object.keys(def.targetPaths!)).toEqual(["setFoo", "setBar"])
  })

  it("should build from/key/each definition", () => {
    const d = new DerivedBuilder<TestState>()
    d.from(s => s.items)
      .key(item => item.id)
      .each((item, d) => {
        // Nested definition would go here using fresh builder `d`
        return d.deps([s => s.count]).target(s => s.$doubled).get(c => c * 2)
      })

    const defs = d.getDefinitions()
    expect(defs).toHaveLength(1)
    expect(isFromEachDefinition(defs[0])).toBe(true)
  })
})
