import { describe, it, expect } from "vitest"
import { createPathSelector, extractKeyPath } from "../path-selector"
import { createKeyedWrapper } from "../keyed-wrapper"
import { resolvePath, setPath } from "../path-instruction"

describe("PathSelector", () => {
  it("should extract simple property path", () => {
    const instructions = createPathSelector((s: any) => s.foo.bar)
    expect(instructions).toEqual([
      { type: "prop", name: "foo" },
      { type: "prop", name: "bar" },
    ])
  })

  it("should extract path with keyed wrapper tokens", () => {
    type State = { pages: { id: string }[] }
    const page = createKeyedWrapper({ id: "p1" }, "id", "p1")
    const instructions = createPathSelector<State>(s => s.pages[page])
    expect(instructions).toEqual([
      { type: "prop", name: "pages" },
      { type: "find", key: "id", value: "p1" },
    ])
  })

  it("should extract nested keyed wrapper paths", () => {
    type State = { pages: { id: string; columns: { id: string; title: string }[] }[] }
    const page = createKeyedWrapper({ id: "p1" }, "id", "p1")
    const col = createKeyedWrapper({ id: "c1" }, "id", "c1")
    const instructions = createPathSelector<State>(
      s => s.pages[page].columns[col].title
    )
    expect(instructions).toEqual([
      { type: "prop", name: "pages" },
      { type: "find", key: "id", value: "p1" },
      { type: "prop", name: "columns" },
      { type: "find", key: "id", value: "c1" },
      { type: "prop", name: "title" },
    ])
  })
})

describe("extractKeyPath", () => {
  it("should extract simple key path", () => {
    const path = extractKeyPath((w: any) => w.id)
    expect(path).toEqual(["id"])
  })

  it("should extract nested key path", () => {
    const path = extractKeyPath((w: any) => w.meta.slug)
    expect(path).toEqual(["meta", "slug"])
  })
})

describe("resolvePath", () => {
  it("should resolve simple property path", () => {
    const state = { foo: { bar: 42 } }
    const result = resolvePath(state, [
      { type: "prop", name: "foo" },
      { type: "prop", name: "bar" },
    ])
    expect(result.value).toBe(42)
    expect(result.path).toEqual(["foo", "bar"])
  })

  it("should resolve path with find", () => {
    const state = {
      pages: [
        { id: "p1", title: "Page 1" },
        { id: "p2", title: "Page 2" },
      ],
    }
    const result = resolvePath(state, [
      { type: "prop", name: "pages" },
      { type: "find", key: "id", value: "p2" },
      { type: "prop", name: "title" },
    ])
    expect(result.value).toBe("Page 2")
    expect(result.path).toEqual(["pages", 1, "title"])
  })
})

describe("setPath", () => {
  it("should set simple property path", () => {
    const state = { foo: { bar: 42 } }
    const newState = setPath(
      state,
      [
        { type: "prop", name: "foo" },
        { type: "prop", name: "bar" },
      ],
      100
    )
    expect(newState).toEqual({ foo: { bar: 100 } })
    expect(newState).not.toBe(state)
  })

  it("should set path with find", () => {
    const state = {
      pages: [
        { id: "p1", title: "Page 1" },
        { id: "p2", title: "Page 2" },
      ],
    }
    const newState = setPath(
      state,
      [
        { type: "prop", name: "pages" },
        { type: "find", key: "id", value: "p2" },
        { type: "prop", name: "title" },
      ],
      "Updated Page 2"
    )
    expect(newState.pages[1].title).toBe("Updated Page 2")
    expect(newState.pages[0]).toBe(state.pages[0])
    expect(newState.pages[1]).not.toBe(state.pages[1])
  })
})
