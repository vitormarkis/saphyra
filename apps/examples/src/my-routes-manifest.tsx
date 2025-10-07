import { ExternalDepsPage } from "~/pages/external-deps/page"
import { RevalidationListPage } from "~/pages/revalidation-list/page"
import { ChangeRolePage } from "./pages/change-role/page"
import { GithubProfilePage } from "./pages/github-profile/page"
import { MemoryGamePage } from "./pages/memory-game/page"
import { ZustandLikePage } from "./pages/zustand-like/page"
import { PokemonPage } from "~/pages/pokemon/page"
import { BeforeDispatchPage } from "./pages/before-dispatch/page"
import { DebouncedSearchPage } from "./pages/debounced-search/page"
import { MultipleOptimisticUpdatesPage } from "./pages/multiple-optimistic-updates/page"
import { ResizeDebouncedPage } from "./pages/resize-debounced/page"
import { DependentSelectPage } from "./pages/dependent-select/page"

export const myRoutesManifest = [
  {
    path: "/github-profile",
    element: <GithubProfilePage />,
  },
  {
    path: "/change-role",
    element: <ChangeRolePage />,
  },
  {
    path: "/zustand-like",
    element: <ZustandLikePage />,
  },
  {
    path: "/memory-game",
    element: <MemoryGamePage />,
  },
  {
    path: "/external-deps",
    element: <ExternalDepsPage />,
  },
  {
    path: "/revalidation-list",
    element: <RevalidationListPage />,
  },
  {
    path: "/before-dispatch",
    element: <BeforeDispatchPage />,
  },
  {
    path: "/debounced-search",
    element: <DebouncedSearchPage />,
  },
  {
    path: "/multiple-optimistic-updates",
    element: <MultipleOptimisticUpdatesPage />,
  },
  {
    path: "/pokemon",
    element: <PokemonPage />,
  },
  {
    path: "/resize-debounced",
    element: <ResizeDebouncedPage />,
  },
  {
    path: "/dependent-select",
    element: <DependentSelectPage />,
  },
]
