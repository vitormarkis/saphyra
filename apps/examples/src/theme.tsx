import { createStoreUtils, newStoreDef } from "./create-store"

type Theme = {
  theme: "light" | "dark"
}

const newThemeStore = newStoreDef<Theme, Theme & any>()

export const themeStore = newThemeStore({ theme: "light" })

export const Theme = createStoreUtils(themeStore)
