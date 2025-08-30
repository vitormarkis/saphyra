import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"

type SettingsState = {
  optimistic: boolean
  errorSometimes: boolean
}

const newSettingsStore = newStoreDef<SettingsState>()

export const settingsStore = newSettingsStore({
  optimistic: false,
  errorSometimes: false,
})

export const SettingsStore =
  createStoreUtils<typeof newSettingsStore>(settingsStore)
