import { ExternalDepsPage } from "~/pages/external-deps/page"
import { ChangeRolePage } from "./pages/change-role/page"
import { GithubProfilePage } from "./pages/github-profile/page"
import { MemoryGamePage } from "./pages/memory-game/page"
import { ZustandLikePage } from "./pages/zustand-like/page"
import { PokemonPage } from "~/pages/pokemon/page"
import { BeforeDispatchPage } from "./pages/before-dispatch/page"
import { ReducerDispatchWhenActorAsync } from "./pages/reducer-dispatch-when-actor-async/page"

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
    path: "/before-dispatch",
    element: <BeforeDispatchPage />,
  },
  {
    path: "/pokemon",
    element: <PokemonPage />,
  },
  {
    path: "/reducer-dispatch-when-actor-async",
    element: <ReducerDispatchWhenActorAsync />,
  },
]
