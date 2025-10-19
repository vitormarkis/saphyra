import { newStoreDef } from "saphyra"
import { createStoreUtils } from "saphyra/react"

type SettingsState = {
  optimistic: boolean
  errorSometimes: boolean
  errorAlways: boolean
  revalidateInDifferentBatches: boolean
  manualRevalidation: boolean
  prefixPairs: boolean
  spinners: boolean
}

const newSettingsStore = newStoreDef<SettingsState>({
  reducer({ state, set, diff }) {
    diff()
      .on([s => s.errorAlways])
      .run(errorAlways => {
        if (errorAlways) set({ errorSometimes: false })
      })
    diff()
      .on([s => s.errorSometimes])
      .run(errorSometimes => {
        if (errorSometimes) set({ errorAlways: false })
      })

    return state
  },
})

const INITIAL_STATE = {
  optimistic: false,
  errorSometimes: false,
  errorAlways: false,
  revalidateInDifferentBatches: false,
  manualRevalidation: false,
  prefixPairs: false,
  spinners: false,
}

export const settingsStore = newSettingsStore(
  localStorage.getItem("settings")
    ? { ...JSON.parse(localStorage.getItem("settings")!), prefixPairs: false }
    : INITIAL_STATE
)

settingsStore.subscribe(() => {
  localStorage.setItem("settings", JSON.stringify(settingsStore.getState()))
})

export const SettingsStore =
  createStoreUtils<typeof newSettingsStore>(settingsStore)
