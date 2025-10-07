import { Icon, Spinner } from "@blueprintjs/core"
import { useEffect, useState } from "react"
import { cn } from "~/lib/cn"

import { useHistory, useNewStore } from "saphyra/react"
import { Waterfall } from "~/devtools/waterfall"
import { DependentSelect, newDependentSelectStore } from "./store"
import { INITIAL_TODOS } from "./consts"
import { cancelPrevious, preventNextOne } from "./before-dispatches"
import { Checkbox } from "~/components/ui/checkbox"
import { Button } from "~/components/ui/button"
import { settingsStore, SettingsStore } from "./settings-store"
import { toastWithRetry } from "./on-transition-ends"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { PostType } from "./types"
import { productionDeps } from "./deps"

export function DependentSelectPage() {
  const [displayingContent, setDisplayingContent] = useState(true)
  const [dependentSelectStore, setDependentSelectStore, isBootstraping] =
    useNewStore(() =>
      newDependentSelectStore({ tag: "life" }, { deps: productionDeps })
    )

  useHistory(dependentSelectStore)

  useEffect(() => {
    Object.assign(window, { dependentSelect: dependentSelectStore })
  }, [dependentSelectStore])

  return (
    <DependentSelect.Context.Provider
      value={[dependentSelectStore, setDependentSelectStore, isBootstraping]}
    >
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
          {isBootstraping ? (
            <div className="w-full h-full grid place-items-center">
              <Spinner size={96} />
            </div>
          ) : (
            <div className="mr-4 relative w-full">
              <DependentSelectContent />
            </div>
          )}
        </div>
        <div className="flex-1 grid min-h-0 min-w-0 h-full gap-4 w-full">
          {/* <div className="size-full p-4">
            <pre>{JSON.stringify(subtransitions, null, 2)}</pre>
          </div> */}
          <Waterfall store={dependentSelectStore} />
        </div>
      </div>
    </DependentSelect.Context.Provider>
  )
}

type DependentSelectContentProps = {}

export function DependentSelectContent({}: DependentSelectContentProps) {
  const posts = DependentSelect.useSelector(s => s.$posts)
  const isPending = DependentSelect.useTransition(["todo"])
  const shouldDisplaySpinners = SettingsStore.useSelector(s => s.spinners)
  const tag = DependentSelect.useSelector(s => s.tag)

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
      <h3 className="text-lg font-medium mb-2">
        Tag:
        <span className="mx-1"></span>
        <span className="inline-block text-lg/none py-1 px-2 rounded-sm bg-blue-500 text-white">
          {tag.toUpperCase()}
        </span>
      </h3>
      <ul className="grid grid-cols-1 gap-2">
        {posts.map(post => (
          <Post
            key={post.id}
            post={post}
          />
        ))}
      </ul>
    </div>
  )
}

type PostProps = {
  post: PostType
}

export function Post({ post }: PostProps) {
  const isPending = DependentSelect.useTransition(["todo"])
  const shouldDisplaySpinners = SettingsStore.useSelector(s => s.spinners)

  return (
    <li
      className={cn(
        "flex items-center gap-3 p-2 relative border rounded-md",
        "border-gray-200 bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-950"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 w-full"
          // todo.disabled && "opacity-40"
        )}
      >
        {shouldDisplaySpinners && (
          <div className="min-w-0">
            <div className="pr-2 aspect-square grid place-items-center">
              {isPending && <span className="animate-spin">🌀</span>}
            </div>
          </div>
        )}
        <div className="font-medium">{post.title}</div>
        <p
          className={cn(
            "text-sm",
            "text-gray-600 dark:text-gray-400"
            // todo.completed && "line-through"
          )}
        >
          {post.body.slice(0, 100)}...
          <span className="text-xs text-blue-400 dark:text-blue-400 underline inline-block ml-2 cursor-pointer">
            Read more
          </span>
        </p>
      </div>
    </li>
  )
}
