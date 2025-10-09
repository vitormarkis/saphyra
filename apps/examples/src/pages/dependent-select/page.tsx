import { Spinner } from "@blueprintjs/core"
import { useEffect, useMemo, useState } from "react"
import { cn } from "~/lib/cn"

import { useBootstrapError, useNewStore } from "saphyra/react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Waterfall } from "~/devtools/waterfall"
import { toastWithSonner } from "~/sonner-error-handler"
import { productionDeps } from "./deps"
import { settingsStore, SettingsStore } from "./settings-store"
import { DependentSelect, newDependentSelectStore } from "./store"
import { PostType } from "./types"
import { ErrorPage } from "~/components/error-page"

export function DependentSelectPage() {
  const [displayingContent, setDisplayingContent] = useState(true)
  const [dependentSelect, resetDependentSelect, isBootstraping] = useNewStore(
    () => newDependentSelectStore({}, { deps: productionDeps })
  )

  useEffect(() => {
    Object.assign(window, { dependentSelect: dependentSelect })
  }, [dependentSelect])

  DependentSelect.useErrorHandlers(toastWithSonner, dependentSelect)

  return (
    <DependentSelect.Context.Provider
      value={[dependentSelect, resetDependentSelect, isBootstraping]}
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
            htmlFor="debounce"
            className="flex flex-col items-center gap-1"
          >
            <span className="text-center h-16 center self-center inline-grid place-items-center">
              Debounce
            </span>
            <Checkbox
              checked={SettingsStore.useSelector(s => s.debounce)}
              onCheckedChange={value => {
                settingsStore.setState({
                  debounce: !!value,
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
            htmlFor="randomLatency"
            className="flex flex-col items-center gap-1"
          >
            <span className="text-center h-16 center self-center inline-grid place-items-center">
              Random
              <br />
              latency
            </span>
            <Checkbox
              checked={SettingsStore.useSelector(s => s.randomLatency)}
              onCheckedChange={value => {
                settingsStore.setState({
                  randomLatency: !!value,
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
          <Waterfall store={dependentSelect} />
        </div>
      </div>
    </DependentSelect.Context.Provider>
  )
}

type DependentSelectContentProps = {}

export function DependentSelectContent({}: DependentSelectContentProps) {
  const [dependentSelect] = DependentSelect.useStore()
  const posts = DependentSelect.useSelector(s => s.$posts)
  const isChangingTag = DependentSelect.useTransition(["change-tag"])
  const shouldDisplaySpinners = SettingsStore.useSelector(s => s.spinners)
  const selectedTag = DependentSelect.useSelector(s => s.selectedTag)
  const commitedSelectedTag = DependentSelect.useCommittedSelector(
    s => s.selectedTag
  )
  const showingOptimisticTag = selectedTag !== commitedSelectedTag
  const tags = DependentSelect.useSelector(s => s.tags)
  const [error, tryAgain] = useBootstrapError(DependentSelect.useStore(), () =>
    newDependentSelectStore({}, { deps: productionDeps })
  )

  if (error != null) {
    return (
      <ErrorPage
        error={error}
        tryAgain={tryAgain}
      />
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between mb-4">
        <div className="h-full flex [&>*]:border-r [&>*]:border-r-gray-800 [&>*:last-child]:border-r-0 "></div>
      </div>
      <div className="flex flex-col p-1">
        <label
          htmlFor="tag"
          className="text-sm/7 font-medium"
        >
          Select tag:
        </label>
        <div className="flex items-center gap-2 h-8">
          <div className="flex-1 flex">
            <select
              value={selectedTag}
              onChange={e => {
                const selectedTag = e.target.value
                dependentSelect.dispatch({
                  type: "change-tag",
                  selectedTag,
                  transition: ["change-tag", selectedTag],
                  beforeDispatch({ action, store, async }) {
                    /**
                     * Abort on going requests
                     */
                    store.abort(["change-tag", "*"])

                    /**
                     * Debounce ?
                     */
                    const settings = settingsStore.getState()
                    if (settings.debounce) {
                      async()
                        .setName(`d [${selectedTag}]`)
                        .setTimeout(() => store.dispatch(action), 700)
                    } else {
                      return action
                    }
                  },
                })
              }}
              className="flex-1"
            >
              {tags.map(tag => (
                <option
                  key={tag.slug}
                  value={tag.slug}
                >
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
          {shouldDisplaySpinners && (
            <div className="aspect-square h-full grid place-items-center">
              {isChangingTag && (
                <span className="animate-spin text-lg">🌀</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="my-2" />
      {/* {shouldDisplaySpinners && (
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
      )} */}
      <h3 className="text-lg font-medium mb-2">
        Tag:
        <span className="mx-1"></span>
        <span
          className={cn(
            "inline-block text-lg/none py-1 px-2 rounded-sm bg-blue-500 text-white transition-all duration-300",
            showingOptimisticTag && "opacity-50"
          )}
        >
          {selectedTag.toUpperCase()}
        </span>
      </h3>
      <ul
        className={cn(
          "grid grid-cols-1 gap-2",
          shouldDisplaySpinners && isChangingTag && "opacity-50"
        )}
      >
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
  const selectedTag = DependentSelect.useSelector(s => s.selectedTag)
  const sortedTags = useMemo(() => {
    return [...post.tags].sort((a, b) =>
      a === selectedTag ? -1 : b === selectedTag ? 1 : 0
    )
  }, [post.tags])

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
        <ul className="flex flex-wrap gap-1">
          {sortedTags.map(tag => (
            <li
              key={tag}
              className="text-sm/none p-1 rounded-sm bg-gray-200 dark:bg-gray-800"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}
