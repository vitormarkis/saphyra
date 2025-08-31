import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"

type SettingsState = {
  optimistic: boolean
  errorSometimes: boolean
  errorAlways: boolean
  revalidateInDifferentBatches: boolean
}

const newSettingsStore = newStoreDef<SettingsState>({
  reducer({ state, set, diff }) {
    if (diff(["errorAlways"])) {
      if (state.errorAlways) set({ errorSometimes: false })
    }
    if (diff(["errorSometimes"])) {
      if (state.errorSometimes) set({ errorAlways: false })
    }

    return state
  },
})

const INITIAL_STATE = {
  optimistic: false,
  errorSometimes: false,
  errorAlways: false,
  revalidateInDifferentBatches: false,
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
