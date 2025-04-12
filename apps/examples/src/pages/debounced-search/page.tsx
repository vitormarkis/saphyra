import { createStoreUtils } from "saphyra/react"
import { useEffect, useState } from "react"
import { newStoreDef } from "saphyra"

type DebouncedSearchEvents = {}

type DebouncedSearchActions = {
  type: "noop"
}

type DebouncedSearchInitialProps = {}

type DebouncedSearchState = {}

const newDebouncedSearch = newStoreDef<
  DebouncedSearchInitialProps,
  DebouncedSearchState,
  DebouncedSearchActions,
  DebouncedSearchEvents
>({
  reducer({ prevState, state, action, async, events }) {
    return state
  },
})

const DebouncedSearch = createStoreUtils<typeof newDebouncedSearch>()

export function DebouncedSearchPage() {
  const debouncedSearchState = useState(() => newDebouncedSearch({}))

  return (
    <DebouncedSearch.Provider value={debouncedSearchState}>
      <DebouncedSearchView
        onGetToken={token => {
          console.log("New token! ", JSON.stringify(token))
        }}
      />
    </DebouncedSearch.Provider>
  )
}

type DebouncedSearchViewProps = {
  onGetToken: (token: string) => void
}

export function DebouncedSearchView({ onGetToken }: DebouncedSearchViewProps) {
  const [debouncedSearch] = DebouncedSearch.useUseState()

  useEffect(() => {
    Object.assign(window, { debouncedSearch })
  }, [debouncedSearch])

  return <></>
}
