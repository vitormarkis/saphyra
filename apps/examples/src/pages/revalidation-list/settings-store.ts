import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"

type SettingsState = {
  optimistic: boolean
  errorSometimes: boolean
  errorAlways: boolean
}

const newSettingsStore = newStoreDef<SettingsState>()

const INITIAL_STATE = {
  optimistic: false,
  errorSometimes: false,
  errorAlways: false,
}

export const settingsStore = newSettingsStore(
  localStorage.getItem("settings")
    ? JSON.parse(localStorage.getItem("settings")!)
    : INITIAL_STATE
)

settingsStore.subscribe(() => {
  localStorage.setItem("settings", JSON.stringify(settingsStore.getState()))
})

export const SettingsStore =
  createStoreUtils<typeof newSettingsStore>(settingsStore)
