// @ts-expect-error
// prettier-ignore
import { highlight, languages } from "prismjs/components/prism-core"
// prettier-ignore
import "prismjs/components/prism-clike"
// prettier-ignore
import "prismjs/components/prism-javascript"
// prettier-ignore
import "prismjs/themes/prism.css"
// prettier-ignore
import "prismjs/themes/prism-okaidia.css"

import { Spinner, Text } from "@blueprintjs/core"
import { useSuspenseQuery } from "@tanstack/react-query"
import { noop } from "lodash"
import { CSSProperties, ReactNode, Suspense, useState } from "react"
import invariant from "tiny-invariant"
import { createStoreUtils, useNewStore } from "saphyra/react"
import { ClassicAction, newStoreDef } from "saphyra"
import { runSuccessCallback } from "saphyra"
import { BaseAction, BeforeDispatch, SomeStoreGeneric } from "saphyra"
import { cn } from "~/lib/cn"
import { formatScript } from "~/lib/prettify-code"
import { Theme } from "~/theme"
import { CodeEditor } from "~/components/code-editor"
import { TextChart } from "~/components/text-chart"

type TransitionsStoreState = {
  count: number
  currentTransition: null
  albums: any[]
  todos: any[]
}

type TransitionsStoreActions =
  | {
      type: "fetch-albums"
    }
  | {
      type: "fetch-todos"
    }

const newTransitionsStore = newStoreDef<
  {},
  TransitionsStoreState,
  TransitionsStoreActions
>({
  onConstruct: () => ({
    count: 0,
    currentTransition: null,
    albums: [],
    todos: [],
  }),
  reducer({ state, action, async, set }) {
    if (action.type === "fetch-albums") {
      async().promise(async ({ signal }) => {
        const endpoint = "https://jsonplaceholder.typicode.com/albums"
        const response = await fetch(endpoint, {
          signal,
        })
        const albums = await response.json()
        set({ albums })
      })
    }

    if (action.type === "fetch-todos") {
      async().promise(async ({ signal }) => {
        const endpoint = "https://jsonplaceholder.typicode.com/todos"
        const response = await fetch(endpoint, {
          signal,
        })
        const todos = await response.json()
        set({ todos })
      })
    }

    return state
  },
})

const TransitionsStore = createStoreUtils<typeof newTransitionsStore>()

/**
 * React
 */
export function BeforeDispatchPage() {
  const [transitionsStore, resetStore, isLoading] = useNewStore(() =>
    newTransitionsStore({})
  )

  return (
    <TransitionsStore.Context.Provider
      value={[transitionsStore, resetStore, isLoading]}
    >
      <div className="flex flex-col gap-4 h-full overflow-auto">
        <BeforeDispatchView />
      </div>
    </TransitionsStore.Context.Provider>
  )
}

type ExampleFactory = (store: SomeStoreGeneric) => {
  title: string
  description: string
  slug: string
  action: BaseAction<any, any, any, any, any>
  actionSupport?: BaseAction<any, any, any, any, any>
  script: string
}

const EXAMPLES_FACTORY: ExampleFactory[] = [
  store => ({
    title: "Normal",
    slug: "normal",
    description: "Dispatch many actions, their result will be merged.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action }) {
        return action
      },
    },
    script: `
      beforeDispatch({ action }) {
        return action
      }
    `,
  }),
  store => ({
    title: "Cancel Previous",
    slug: "cancel-previous",
    description: "It will cancel the current transition and dispatch a new one",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, abort, transition, transitionStore }) {
        if (transitionStore.isHappeningUnique(transition)) {
          abort(transition)
        }

        return action
      },
    },
    script: `
      beforeDispatch({ action, abort, transition, transitionStore }) {
        if (transitionStore.isHappeningUnique(transition)) {
          abort(transition)
        }

        return action
      }
    `,
  }),
  store => ({
    title: "Cancel Action",
    slug: "cancel-action",
    description: "It will just cancel the current transition.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, abort, transition, transitionStore }) {
        if (transitionStore.isHappeningUnique(transition)) {
          abort(transition)
          return // early return
        }

        return action
      },
    },
    script: `
      beforeDispatch({ action, abort, transition, transitionStore }) {
        if (transitionStore.isHappeningUnique(transition)) {
          abort(transition)
          return // early return
        }

        return action
      }
    `,
  }),
  store => ({
    title: "One at time",
    slug: "one-at-time",
    description:
      "Don't even dispatch the action if there is already one running.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, transitionStore, transition }) {
        if (transitionStore.isHappeningUnique(transition)) {
          return
        }
        return action
      },
    },
    script: `
      beforeDispatch({ action, transitionStore, transition }) {
        if (transitionStore.isHappeningUnique(transition)) {
          return
        }
        return action
      }
    `,
  }),
  store => ({
    title: "Debouncing",
    slug: "debouncing",
    description: "Delay an action",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, transition, abort, createAsync, store }) {
        const async = createAsync()
        abort(transition)
        async().setTimeout(() => store.dispatch(action), 500)
      },
    },
    script: `
      beforeDispatch({ transition, abort, createAsync, store, action }) {
        const async = createAsync()
        abort(transition)
        async().setTimeout(() => store.dispatch(action), 500)
      }
    `,
  }),
  store => ({
    title: "Throttle",
    slug: "throttle",
    description: "Dispatch the action only once every 1 second.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, meta }) {
        const now = Date.now()
        meta.timestamps ??= []
        meta.timestamps = meta.timestamps.filter(
          (ts: number) => now - ts < 1000 // 1 second
        )
        if (meta.timestamps.length >= 1) return // 1 action
        meta.timestamps.push(now)
        return action
      },
    },
    script: `
      beforeDispatch({ action, meta }) {
        const now = Date.now()
        meta.timestamps ??= []
        meta.timestamps = meta.timestamps.filter(
          ts => now - ts < 1000 // 1 second
        )
        if (meta.timestamps.length >= 1) return // 1 action
        meta.timestamps.push(now)
        return action
      }
    `,
  }),
  store => ({
    title: "Rate limit",
    slug: "rate-limit",
    description: "Dispatch only 2 actions every 5 seconds.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, meta }) {
        const now = Date.now()
        meta.timestamps ??= []
        meta.timestamps = meta.timestamps.filter(
          (ts: number) => now - ts < 5000 // 5 seconds
        )
        if (meta.timestamps.length >= 2) return // 2 actions
        meta.timestamps.push(now)
        return action
      },
    },
    script: `
      beforeDispatch({ action, meta }) {
        const now = Date.now()
        meta.timestamps ??= []
        meta.timestamps = meta.timestamps.filter(
          ts => now - ts < 5000 // 5 seconds
        )
        if (meta.timestamps.length >= 2) return // 2 actions
        meta.timestamps.push(now)
        return action
      }
    `,
  }),
  store => ({
    title: "Timeout",
    slug: "timeout",
    description:
      "Dispatch an action, if it takes more than 1 second, cancel it.",
    action: {
      type: "fetch-albums",
      transition: ["albums"],
      beforeDispatch({ action, transitionStore, transition }) {
        const timeoutId = setTimeout(() => {
          const controller = transitionStore.controllers.get(transition)
          controller?.abort()
        }, 1000) // 1 second
        return {
          ...action,
          onTransitionEnd(props: any) {
            clearTimeout(timeoutId)
            return action.onTransitionEnd?.(props)
          },
        }
      },
    },
    script: `
      beforeDispatch({ action, abort, transition }) {
        const timeoutId = setTimeout(() => {
          abort(transition)
        }, 1000) // 1 second

        return {
          ...action,
          onTransitionEnd(props) {
            clearTimeout(timeoutId)
            return action.onTransitionEnd?.(props)
          },
        }
      }
    `,
  }),
  // store => ({
  //   title: "Wait for other",
  //   slug: "wait-for-other",
  //   description:
  //     "Click the left button, then the right one quickly. The right transition should only starts once the left is done.",
  //   action: {
  //     type: "fetch-albums",
  //     transition: ["albums"],
  //     beforeDispatch({ action, transitionStore }) {
  //       const fetchingTodos = transitionStore.isHappeningUnique(["todos"])
  //       if (!fetchingTodos) return action
  //       transitionStore.events.done.once(["todos"].join(":")).run(() => {
  //         setTimeout(() => {
  //           store.dispatch(action)
  //         })
  //       })
  //     },
  //   },
  //   actionSupport: {
  //     type: "fetch-todos",
  //     transition: ["todos"],
  //     beforeDispatch({ action, transitionStore, transition }) {
  //       if (transitionStore.isHappeningUnique(transition)) {
  //         return
  //       }
  //       return action
  //     },
  //   },
  //   script: `
  //     beforeDispatch({ action, transitionStore }) {
  //       const fetchingTodos = transitionStore.isHappeningUnique(["todos"])
  //       if (!fetchingTodos) return action
  //       transitionStore.events.done.once(["todos"].join(":")).run(() => {
  //         setTimeout(() => {
  //           store.dispatch(action)
  //         })
  //       })
  //     }
  //   `,
  // }),
  // store => ({
  //   title: "Wait for other (loading)",
  //   slug: "wait-for-other-loading",
  //   description:
  //     "Same as the previous one, but let's display a loading indicator while the left transition is finishing.",
  //   action: {
  //     type: "fetch-albums",
  //     transition: ["albums"],
  //     beforeDispatch({ action, transitionStore, transition }) {
  //       const fetchingTodos = transitionStore.isHappeningUnique(["todos"])
  //       if (!fetchingTodos) return action
  //       transitionStore.addKey(transition)
  //       transitionStore.events.done.once(["todos"].join(":")).run(() => {
  //         setTimeout(() => {
  //           store.dispatch(action)
  //           transitionStore.doneKey(transition, {
  //             onFinishTransition: runSuccessCallback,
  //           })
  //         })
  //       })
  //     },
  //   },
  //   actionSupport: {
  //     type: "fetch-todos",
  //     transition: ["todos"],
  //     beforeDispatch({ action, transitionStore, transition }) {
  //       if (transitionStore.isHappeningUnique(transition)) {
  //         return
  //       }
  //       return action
  //     },
  //   },
  //   script: `
  //     beforeDispatch({ action, transitionStore, transition }) {
  //       const fetchingTodos = transitionStore.isHappeningUnique(["todos"])
  //       if (!fetchingTodos) return action
  //       transitionStore.addKey(transition)
  //       transitionStore.events.done.once(["todos"].join(":")).run(() => {
  //         setTimeout(() => {
  //           store.dispatch(action)
  //           transitionStore.doneKey(transition, {
  //             onFinishTransition: runSuccessCallback,
  //           })
  //         })
  //       })
  //     }
  //   `,
  // }),
]

export function BeforeDispatchView() {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="grid grid-cols-[1fr,1fr,auto] gap-4 mb-6">
        <TextChart.Wrapper className="h-fit w-72 min-w-0">
          To experience the examples below{" "}
          <TextChart.Important>
            put your network to 3G on the network tab
          </TextChart.Important>{" "}
          and start testing
        </TextChart.Wrapper>
        <img
          className="rounded-md border border-black/50 shadow w-72"
          src="/3g.png"
          alt=""
        />
      </div>
      <ul className="grid grid-rows-[auto,1fr,auto] grid-cols-1 @md:grid-cols-1 @lg:grid-cols-2 @5xl:grid-cols-3 gap-x-3 gap-y-8">
        {EXAMPLES_FACTORY.map((createExample, i) => (
          <StoreProvider>
            <Example
              key={i}
              createExample={createExample}
            />
          </StoreProvider>
        ))}
      </ul>
    </div>
  )
}

type StoreProviderProps = {
  children: ReactNode
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [storeState, resetStore, isLoading] = useNewStore(() =>
    newTransitionsStore({})
  )

  return (
    <TransitionsStore.Context.Provider
      value={[storeState, resetStore, isLoading]}
    >
      {children}
    </TransitionsStore.Context.Provider>
  )
}

type ExampleProps = {
  createExample: ExampleFactory
}

export function Example({ createExample }: ExampleProps) {
  const theme = Theme.useCommittedSelector(s => s.theme)
  const [store] = TransitionsStore.useStore()
  const example = createExample(store)
  const transition = [...example.action.transition!]
  const transitionSupport = example.actionSupport
    ? [...example.actionSupport.transition!]
    : []
  const isPendingAction = TransitionsStore.useTransition(transition)
  const isPendingActionSupport =
    TransitionsStore.useTransition(transitionSupport)

  return (
    <div
      key={example.slug}
      className={cn(
        "grid grid-rows-subgrid row-span-3 border dark:border-gray-600 p-2 rounded-md relative gap-y-2",
        isPendingAction && "border-amber-600 dark:border-amber-400"
      )}
    >
      <h2
        className={cn(
          "text-lg font-semibold",
          "-translate-y-[50%] left-2 top-0 px-1 bg-white dark:bg-gray-950 w-fit absolute"
        )}
      >
        {example.title}
      </h2>
      <p className="row-start-1 text-sm/none py-2 px-3 rounded-sm text-gray-700 bg-gray-100 dark:bg-gray-900 dark:text-gray-300 mt-2">
        {example.description}
      </p>
      <Suspense fallback={<Spinner size={48} />}>
        <CodeBlock example={example} />
      </Suspense>
      <div className="grid gap-2">
        {example.actionSupport && (
          <button
            onClick={() => {
              invariant(example.actionSupport)
              store.dispatch({
                ...(example.actionSupport as any),
                transition: transitionSupport,
              })
            }}
            className={cn(
              "row-start-2",
              isPendingActionSupport &&
                "border-red-500 ring-2 ring-red-700/50 hover:border-red-600 hover:ring-red-700/50 opacity-80"
            )}
          >
            Click 🎉
          </button>
        )}
        <button
          onClick={() => {
            store.dispatch({
              ...(example.action as any),
              transition,
            })
          }}
          className={cn(
            "row-start-2",
            isPendingAction &&
              "border-red-500 ring-2 ring-red-700/50 hover:border-red-600 hover:ring-red-700/50 opacity-80"
          )}
        >
          Submit
        </button>
      </div>
    </div>
  )
}

type CodeBlockProps = {
  example: ReturnType<ExampleFactory>
}

export function CodeBlock({ example }: CodeBlockProps) {
  const theme = Theme.useCommittedSelector(s => s.theme)
  const { data } = useSuspenseQuery({
    queryKey: ["code", example.script, example.slug],
    queryFn: async () => {
      if (!example.action.beforeDispatch)
        return {
          longestLineLength: 8,
          script: "() => {}",
        }
      let _code = `function ${example.script}`
      _code = processFunctionString(_code)
      _code = await formatScript({ script: _code })
      // _code = removeExtraLine(_code)
      const { longestLine, newScript } = getLongestLine(_code)
      return {
        script: newScript,
        longestLineLength: longestLine.length,
      }
    },
    staleTime: Infinity,
  })

  const { script: code, longestLineLength } = data

  return <CodeEditor value={code} />
}

function processFunctionString(funcString: string) {
  funcString = funcString.replace(/(\d+e[+-]?\d+)/gi, match =>
    String(Number(match))
  )
  funcString = funcString.replace(/(\s*)(\/\/[^\n]*)\n\s*/g, "$2\n ")
  return funcString
}

function getLongestLine(input: string) {
  let [lastLine, ...lines] = input.split("\n").toReversed()

  let longestLine = ""
  lines.forEach(line => {
    if (line.length > longestLine.length) {
      longestLine = line
    }
  })

  lines = lines.toReversed()
  return {
    longestLine: longestLine.trim(),
    newScript: lines.join("\n"),
  }
}

export function removeExtraLine(code: string) {
  return code
}
