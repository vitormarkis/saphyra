import { Icon } from "@blueprintjs/core"
import { Suspense, use, useEffect, useReducer, useState } from "react"
import { cn } from "~/lib/cn"

import { useHistory } from "saphyra/react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { Waterfall } from "~/devtools/waterfall"
import { cancelPrevious, preventNextOne } from "./before-dispatches"
import { toastWithRetry } from "./on-transition-ends"
import { settingsStore, SettingsStore } from "./settings-store"
import { newRevalidationListStore, RevalidationList } from "./store"

export function RevalidationListPage() {
  const [displayingContent, setDisplayingContent] = useState(true)
  const [revalidationListStore] = useState(() =>
    newRevalidationListStore({}, {})
  )

  useHistory(revalidationListStore)

  useEffect(() => {
    Object.assign(window, { revalidationList: revalidationListStore })
  }, [revalidationListStore])

  const [loadin, toggle] = useReducer(s => !s, false)
  useEffect(() => {
    Object.assign(window, { toggle })
  }, [])

  return (
    <RevalidationList.Context.Provider
      value={[revalidationListStore, () => {}, false]}
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <div className="absolute top-6 left-0 right-0 z-40">
          <div className="flex items-center gap-4 px-8">
            <label
              htmlFor="spinners"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Spinners
              </span>
              <Checkbox
                checked={SettingsStore.useSelector(s => s.spinners)}
                onCheckedChange={value => {
                  settingsStore.setState({
                    spinners: !!value,
                  })
                }}
              />
            </label>
            <label
              htmlFor="optimistic"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Optimistic
              </span>
              <Checkbox
                checked={SettingsStore.useSelector(s => s.optimistic)}
                onCheckedChange={value => {
                  settingsStore.setState({
                    optimistic: !!value,
                  })
                }}
              />
            </label>
            <label
              htmlFor="optimistic"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Error
                <br />
                sometimes
              </span>
              <Checkbox
                checked={SettingsStore.useSelector(s => s.errorSometimes)}
                onCheckedChange={value => {
                  settingsStore.setState({
                    errorSometimes: !!value,
                  })
                }}
              />
            </label>
            <label
              htmlFor="errorAlways"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Error
                <br />
                always
              </span>
              <Checkbox
                checked={SettingsStore.useSelector(s => s.errorAlways)}
                onCheckedChange={value => {
                  settingsStore.setState({
                    errorAlways: !!value,
                  })
                }}
              />
            </label>
            <label
              htmlFor="revalidateInDifferentBatches"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Revalidate in
                <br />
                batches of 2 rows
              </span>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={SettingsStore.useSelector(
                    s => s.revalidateInDifferentBatches
                  )}
                  onCheckedChange={value => {
                    settingsStore.setState({
                      revalidateInDifferentBatches: !!value,
                    })
                  }}
                />
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Icon icon="info-sign" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-background border rounded-lg"
                    >
                      <p className="text-xs bg-background text-foreground max-w-[200px]">
                        Toggle enabled and complete for each row and see what
                        happens
                        <br />
                        <br />
                        Useful for different parallel revalidation strategies,
                        like per boardId, columnId, pageSlug, cardId, etc.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </label>
            <label
              htmlFor="manualRevalidation"
              className="flex flex-col items-center gap-1"
            >
              <span className="text-center h-16 center self-center inline-grid place-items-center">
                Manual
                <br />
                revalidation
              </span>
              <div className="flex gap-2 items-center">
                <Checkbox
                  checked={SettingsStore.useSelector(s => s.manualRevalidation)}
                  onCheckedChange={value => {
                    settingsStore.setState({
                      manualRevalidation: !!value,
                    })
                  }}
                />
                <Button
                  className="size-6 p-0"
                  onClick={() => {
                    revalidationListStore.dispatch({
                      type: "revalidate-todos",
                      transition: ["revalidate-todo-list"],
                      beforeDispatch: cancelPrevious,
                    })
                  }}
                >
                  R
                </Button>
              </div>
            </label>
            {/* <label
            htmlFor="prefixPairs"
            className="flex flex-col items-center gap-1 "
          >
            <span className="text-center h-16 center self-center inline-grid place-items-center max-w-[150px]">
              [Async Effect] <br />
              Prefix to-dos when completing pairs
            </span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={SettingsStore.useSelector(s => s.prefixPairs)}
                onCheckedChange={value => {
                  settingsStore.setState({
                    prefixPairs: !!value,
                  })
                }}
              />
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <Icon icon="info-sign" />
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-background border rounded-lg"
                  >
                    <p className="text-xs bg-background text-foreground max-w-[200px]">
                      When you complete two unpaired todos, an client-side async
                      effect will run to pair them. Once paired, they're locked
                      and titles reflect the connection.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </label> */}
          </div>
          <div className="flex justify-center pt-4">
            <Button
              className="w-fit"
              onClick={() => setDisplayingContent(prev => !prev)}
            >
              Expand waterfall
            </Button>
          </div>
        </div>
      </Suspense>
      <div
        className={cn(
          "h-full gap-4 flex flex-col @xl:flex-row overflow-hidden pt-40"
        )}
      >
        <div
          className={cn(
            "flex-1 flex justify-between min-h-0 min-w-0 h-full overflow-auto w-1/2",
            !displayingContent && "hidden"
          )}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <div className="mr-4 relative w-full">
              <PostList />
            </div>
          </Suspense>
        </div>
        <div className="flex-1 grid min-h-0 min-w-0 h-full gap-4 w-full">
          {/* <div className="size-full p-4">
            <pre>{JSON.stringify(subtransitions, null, 2)}</pre>
          </div> */}
          <Waterfall store={revalidationListStore} />
        </div>
      </div>
    </RevalidationList.Context.Provider>
  )
}

type PostListProps = {}

export function PostList({}: PostListProps) {
  const todos = RevalidationList.useSelector(s => use(s.todos))
  const isPending = RevalidationList.useTransition(["todo"])
  const shouldDisplaySpinners = SettingsStore.useSelector(s => s.spinners)

  return (
    <div className="flex flex-col">
      <div className="flex justify-between mb-4">
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 "></div>
      </div>
      {shouldDisplaySpinners && (
        <div
          className={cn(
            "flex items-center gap-2 p-3 invisible",
            isPending && "visible"
          )}
        >
          <p>Board is pending: </p>
          <div className="aspect-square h-6 grid place-items-center">
            {isPending && <span className="animate-spin">🌀</span>}
          </div>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-2">
        {todos.map(todo => (
          <Todo
            key={todo.id}
            todoId={todo.id}
          />
        ))}
      </ul>
    </div>
  )
}

type TodoProps = {
  todoId: number
}

export function Todo({ todoId }: TodoProps) {
  const [revalidationStore] = RevalidationList.useStore()
  const todosById = RevalidationList.useSelector(s => use(s.$todosById))
  const todo = todosById[todoId]
  const isPending = RevalidationList.useTransition(["todo", todoId])
  const shouldDisplaySpinners = SettingsStore.useSelector(s => s.spinners)

  return (
    <li
      className={cn(
        "flex items-center gap-3 p-1 relative border rounded-md",
        "border-gray-200 bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-950"
      )}
    >
      <div className="flex-shrink-0 flex gap-2">
        <div
          role="button"
          onClick={function tryAgain() {
            revalidationStore.dispatch({
              type: "toggle-disabled",
              todoId: todo.id,
              disabled: !todo.disabled,
              transition: ["todo", todo.id, "toggle-disabled"],
              beforeDispatch: preventNextOne,
              onTransitionEnd: toastWithRetry(tryAgain),
            })
          }}
          className={cn(
            "px-2 py-1 text-xs rounded border w-[70px] text-center select-none",
            "border-gray-300 dark:border-gray-600",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "transition-colors duration-200",
            todo.disabled
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {todo.disabled ? "Enable" : "Disable"}
        </div>
      </div>
      <div
        className={cn(
          "flex gap-2 items-center w-full",
          todo.disabled && "opacity-40"
        )}
      >
        {shouldDisplaySpinners && (
          <div className="min-w-0">
            <div className="pr-2 aspect-square h-6 grid place-items-center">
              {isPending && <span className="animate-spin">🌀</span>}
            </div>
          </div>
        )}
        <div className="flex-shrink-0">
          <div
            role="button"
            onClick={function tryAgain() {
              if (todo.disabled) return

              revalidationStore.dispatch({
                type: "toggle-todo",
                todoId: todo.id,
                completed: !todo.completed,
                transition: ["todo", todo.id, "toggle"],
                beforeDispatch: preventNextOne,
                onTransitionEnd: toastWithRetry(tryAgain),
              })
            }}
            className={cn(
              "w-8 h-8 rounded border-2 flex items-center justify-center",
              "border-gray-300 dark:border-gray-700",
              todo.completed && "bg-blue-500 border-blue-500",
              todo.disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {todo.completed && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              "text-gray-900 dark:text-gray-100",
              todo.completed && "line-through"
            )}
          >
            {todo.title}
          </p>
        </div>
      </div>
    </li>
  )
}

function LoadingSkeleton() {
  return (
    <div className="mr-4 relative w-full">
      <div className="flex justify-between mb-4">
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 "></div>
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 p-1 relative border rounded-md animate-pulse",
              "border-gray-200 bg-gray-50",
              "dark:border-gray-800 dark:bg-gray-950"
            )}
          >
            <div className="flex-shrink-0 flex gap-2">
              <div className="px-2 py-1 w-[70px] h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex gap-2 items-center w-full">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </ul>
    </div>
  )
}
