import { ExternalDepsPage } from "~/pages/external-deps/page"
import { ChangeRolePage } from "./pages/change-role/page"
import { GithubProfilePage } from "./pages/github-profile/page"
import { MemoryGamePage } from "./pages/memory-game/page"
import { ZustandLikePage } from "./pages/zustand-like/page"
import { PokemonPage } from "~/pages/pokemon/page"
import { BeforeDispatchPage } from "./pages/before-dispatch/page"
import { DebouncedSearchPage } from "./pages/debounced-search/page"
import { MultipleOptimisticUpdatesPage } from "./pages/multiple-optimistic-updates/page"
import { RouteObject } from "react-router-dom"

export const myRoutesManifest: RouteObject[] = [
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
]
