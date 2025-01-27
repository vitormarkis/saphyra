import { Icon } from "@blueprintjs/core"
import { usePostHog } from "posthog-js/react"
import { useLocation, Link } from "react-router-dom"

type GoToSourceButtonProps = {}

const showProvider = new Set(["/memory-game"])

export function GoToSourceButton({}: GoToSourceButtonProps) {
  const { pathname } = useLocation()
  const href = showProvider.has(pathname)
    ? "https://github.com/vitormarkis/saphyra/blob/main/src/pages$$$/game/provider.tsx"
    : "https://github.com/vitormarkis/saphyra/blob/main/src/pages$$$/page.tsx"
  const finalHref =
    pathname === "/"
      ? "https://github.com/vitormarkis/saphyra/blob/main/src/App.tsx"
      : href.replace("$$$", pathname)
  const posthog = usePostHog()

  return (
    <div className="absolute top-2 right-2 ">
      <Link
        to={finalHref}
        target="_blank"
        className={
          "border border-black px-4 h-8 text-xs flex bg-lime-400 text-black items-center gap-2 rounded-md hover:text-black hover:bg-lime-500"
        }
        onClick={() => {
          posthog.capture("go_to_source", {
            source: finalHref,
          })
        }}
      >
        <Icon
          icon="add-column-right"
          size={12}
        />
        Go to source
      </Link>
    </div>
  )
}
