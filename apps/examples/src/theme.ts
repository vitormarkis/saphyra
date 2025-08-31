import { createStoreUtils } from "saphyra/react"
import { newStoreDef } from "saphyra"

type Theme = {
  theme: "light" | "dark"
}

const newThemeStore = newStoreDef<Theme, Theme>({
  reducer() {
    return {
      theme: "light",
    }
  },
})

export const themeStore = newThemeStore({ theme: "light" })

export const Theme = createStoreUtils(themeStore)
