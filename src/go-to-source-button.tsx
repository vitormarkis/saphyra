import { Icon } from "@blueprintjs/core"
import { useLocation, Link } from "react-router-dom"

type GoToSourceButtonProps = {}

export function GoToSourceButton({}: GoToSourceButtonProps) {
  const href = "https://github.com/vitormarkis/auth-machine/blob/main/src/pages$$$/page.tsx"
  const { pathname } = useLocation()
  const finalHref =
    pathname === "/"
      ? "https://github.com/vitormarkis/auth-machine/blob/main/src/App.tsx"
      : href.replace("$$$", pathname)

  return (
    <div className="absolute top-2 right-2 ">
      <Link
        to={finalHref}
        target="_blank"
        className={
          "border border-black px-4 h-8 text-xs flex bg-lime-400 text-black items-center gap-2 rounded-md hover:text-black hover:bg-lime-500"
        }
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
