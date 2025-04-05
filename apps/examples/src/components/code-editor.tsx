// @ts-expect-error
// prettier-ignore
import { highlight, languages } from "prismjs/components/prism-core"

import "prismjs/components/prism-clike"
// prettier-ignore
import "prismjs/components/prism-javascript"
// prettier-ignore
import "prismjs/themes/prism.css"
// prettier-ignore
import "prismjs/themes/prism-okaidia.css"

import React, { CSSProperties } from "react"
import Editor from "react-simple-code-editor"
import { cn } from "~/lib/cn"
import { Theme } from "~/theme"
import st from "./code-editor.module.css"
import { noop } from "~/lib/utils"
import { type RequireKeys } from "saphyra"

export type CodeEditorProps = RequireKeys<
  Partial<React.ComponentPropsWithoutRef<typeof Editor>>,
  "value"
> & {
  wrapperClassName?: string
  longestLineLength?: number
}

export const CodeEditor = React.forwardRef<
  React.ElementRef<typeof Editor>,
  CodeEditorProps
>(function CodeEditorComponent(
  {
    name,
    highlight: highlightProps,
    padding,
    preClassName,
    textareaClassName,
    style,
    onValueChange = noop,
    longestLineLength,
    className,
    wrapperClassName,
    ...props
  },
  ref
) {
  longestLineLength ??= props.value.split("").length
  const theme = Theme.useStore(s => s.theme)
  return (
    <div
      className={cn(
        "grow shrink-0 basis-0 min-h-0 flex flex-col min-w-0 flex-1 h-full",
        st.fixStyles,
        theme === "light" && st.color_light_mode,
        wrapperClassName
      )}
    >
      <div className="flex grow rounded-sm overflow-y-auto dark:border-gray-800 border-gray-200 border focus-within:ring-1 focus-within:ring-blue-100 focus-within:border-blue-600 h-fit">
        {/* <pre>{longestLineLength}</pre> */}
        <div
          className="min-w-[--code-width] w-full outline-amber-500 ring-amber-500 border-amber-600"
          style={
            {
              "--code-width": `calc(${longestLineLength}px * 8.4)`,
            } as CSSProperties
          }
        >
          <Editor
            ref={ref}
            className={cn(
              "font-mono text-[10px] min-w-[--code-width] w-full h-full min-h-min py-2 px-4 dark:bg-gray-900 rounded-sm outline-none border-none ",
              className
            )}
            onValueChange={(...args) => {
              return onValueChange(...args)
            }}
            name="on_dispatch"
            highlight={code => {
              if (highlightProps) {
                return highlightProps(code)
              }
              return highlight(code, languages.javascript)
            }}
            padding={padding ?? 12}
            preClassName={cn(
              "outline-amber-500 ring-amber-500 border-amber-600",
              preClassName
            )}
            textareaClassName={cn(
              "focus-visible:border-none focus-visible:outline-none outline-amber-500 ring-amber-500 border-amber-600",
              textareaClassName
            )}
            style={{
              fontFamily:
                '"JetBrains Mono" "Fira code", "Fira Mono", monospace',
              fontSize: 12,
              ...style,
            }}
            {...props}
          />
        </div>
      </div>
    </div>
  )
})
