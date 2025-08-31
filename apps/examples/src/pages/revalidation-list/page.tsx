import { Spinner } from "@blueprintjs/core"
import { useEffect, useState, useSyncExternalStore } from "react"
import { Devtools } from "~/devtools/devtools"
import { cn } from "~/lib/cn"
import { toastWithSonner } from "~/sonner-error-handler"

import { useHistory, useNewStore } from "saphyra/react"
import { Waterfall } from "~/devtools/waterfall"
import { newRevalidationListStore, RevalidationList } from "./store"
import { INITIAL_TODOS } from "./consts"
import { toast } from "sonner"
import { cancelPrevious, preventNextOne } from "./before-dispatches"
import { Checkbox } from "~/components/ui/checkbox"
import { Button } from "~/components/ui/button"
import { settingsStore, SettingsStore } from "./settings-store"
import { toastWithRetry } from "./on-transition-ends"

export function RevalidationListPage() {
  const [displayingContent, setDisplayingContent] = useState(true)
  const [revalidationListStore, setRevalidationListStore, isBootstraping] =
    useNewStore(() =>
      newRevalidationListStore(
        {
          todos: INITIAL_TODOS,
        },
        {}
      )
    )

  useHistory(revalidationListStore)

  useEffect(() => {
    Object.assign(window, { revalidationList: revalidationListStore })
  }, [revalidationListStore])

  return (
    <RevalidationList.Context.Provider
      value={[revalidationListStore, setRevalidationListStore, isBootstraping]}
    >
      <div className="absolute top-6 left-0 right-0 z-40">
        <div className="flex items-center gap-4 px-8">
          <label
            htmlFor="optimistic"
            className="flex flex-col items-center gap-1"
          >
            <span className="text-center h-12 inline-grid place-items-center">
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
            <span className="text-center h-12 inline-grid place-items-center">
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
            <span className="text-center h-12 inline-grid place-items-center">
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
        </div>
        <div className="flex justify-center">
          <Button
            className="w-fit"
            onClick={() => setDisplayingContent(prev => !prev)}
          >
            Toggle content visibility
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "h-full gap-4 flex flex-col @xl:flex-row overflow-hidden pt-24"
        )}
      >
        <div
          className={cn(
            "flex-1 flex justify-between min-h-0 min-w-0 h-full overflow-auto w-1/2",
            !displayingContent && "hidden"
          )}
        >
          {isBootstraping ? (
            <div className="w-full h-full grid place-items-center">
              <Spinner size={96} />
            </div>
          ) : (
            <div className="mr-4 relative w-full">
              <PostList />
            </div>
          )}
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
  const todos = RevalidationList.useSelector(s => s.todos)

  return (
    <div className="flex flex-col">
      <div className="flex justify-between mb-4">
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 "></div>
      </div>
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
  const todo = RevalidationList.useSelector(s => s.$todosById[todoId])
  const isPending = RevalidationList.useTransition(["todo", todoId])

  return (
    <li
      className={cn(
        "flex items-center gap-3 p-1 relative border rounded-md",
        "border-gray-200 bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-950",
        todo.disabled && "opacity-40"
      )}
    >
      <div className="flex-shrink-0 flex gap-2">
        {/* {isPending && <Spinner size={16} />} */}
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
            "px-2 py-1 text-xs rounded border",
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
    </li>
  )
}
