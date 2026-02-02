import { createStoreUtils, useNewStore } from "syberia/react"
import { newSyberiaStore, type Transition } from "syberia"
import { memo, useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { sleep } from "~/sleep"

type Card = {
  id: string
  title: string
  done: boolean
}

type Column = {
  id: string
  title: string
  cards: Card[]
}

type Page = {
  id: string
  columns: Column[]
}

type State = {
  pages: Page[]
}

type Actions =
  | { type: "toggle-card"; pageId: string; cardId: string }
  | { type: "rename-card"; pageId: string; cardId: string; title: string }

function stripPrefix(title: string): string {
  return title.replace(/^\[(DONE|TODO)\]\s*/, "")
}

const newSyberiaCardsStore = newSyberiaStore<State, State, Actions>({
  onConstruct() {
    return {
      pages: [
        {
          id: "p1",
          columns: [
            {
              id: "c1",
              title: "To Do",
              cards: [
                { id: "card-1", title: "Pay bills", done: false },
                { id: "card-2", title: "Buy groceries", done: false },
                { id: "card-3", title: "Call mom", done: true },
              ],
            },
            {
              id: "c2",
              title: "In Progress",
              cards: [
                { id: "card-4", title: "Write report", done: false },
                { id: "card-5", title: "Review code", done: false },
              ],
            },
            {
              id: "c3",
              title: "Done",
              cards: [{ id: "card-6", title: "Deploy app", done: true }],
            },
          ],
        },
      ],
    }
  },

  derived: d => [
    d
      .from(s => s.pages)
      .key(p => p.id)
      .each((page, d1) =>
        d1
          .from(() => page.columns)
          .key(c => c.id)
          .each((col, d2) =>
            d2
              .from(() => col.cards)
              .key(card => card.id)
              .each((card, d3) =>
                d3
                  .deps([
                    $ => $.pages[page].columns[col].cards[card].done,
                    $ => $.pages[page].columns[col].cards[card].title,
                  ])
                  .target($ => $.pages[page].columns[col].cards[card].title)
                  .getAsync((done, title) => async ({ signal }) => {
                    // Simulate async work
                    await sleep(300, `updating title for ${card.id}`, signal)
                    return done
                      ? `[DONE] ${stripPrefix(title)}`
                      : `[TODO] ${stripPrefix(title)}`
                  })
              )
          )
      ),
  ],

  reducer({ state, action, set }) {
    if (action.type === "toggle-card") {
      set(prev => ({
        ...prev,
        pages: prev.pages.map(page =>
          page.id === action.pageId
            ? {
                ...page,
                columns: page.columns.map(col => ({
                  ...col,
                  cards: col.cards.map(card =>
                    card.id === action.cardId
                      ? { ...card, done: !card.done }
                      : card
                  ),
                })),
              }
            : page
        ),
      }))
    } else if (action.type === "rename-card") {
      set(prev => ({
        ...prev,
        pages: prev.pages.map(page =>
          page.id === action.pageId
            ? {
                ...page,
                columns: page.columns.map(col => ({
                  ...col,
                  cards: col.cards.map(card =>
                    card.id === action.cardId
                      ? { ...card, title: action.title }
                      : card
                  ),
                })),
              }
            : page
        ),
      }))
    }
    return state
  },
})

type SyberiaCardsStore = ReturnType<typeof newSyberiaCardsStore>
const SyberiaCards = createStoreUtils<() => SyberiaCardsStore>()

export function SyberiaCardsPage() {
  const [store, resetStore, isLoading] = useNewStore(() =>
    newSyberiaCardsStore({
      pages: [
        {
          id: "p1",
          columns: [
            {
              id: "c1",
              title: "To Do",
              cards: [
                { id: "card-1", title: "Pay bills", done: false },
                { id: "card-2", title: "Buy groceries", done: false },
                { id: "card-3", title: "Call mom", done: true },
              ],
            },
            {
              id: "c2",
              title: "In Progress",
              cards: [
                { id: "card-4", title: "Write report", done: false },
                { id: "card-5", title: "Review code", done: false },
              ],
            },
            {
              id: "c3",
              title: "Done",
              cards: [{ id: "card-6", title: "Deploy app", done: true }],
            },
          ],
        },
      ],
    })
  )

  useEffect(() => {
    Object.assign(window, { syberiaCards: store })
  }, [store])

  return (
    <SyberiaCards.Context.Provider value={[store, resetStore, isLoading]}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Syberia Cards</h1>
        <SyberiaCardsContent />
      </div>
    </SyberiaCards.Context.Provider>
  )
}

const SyberiaCardsContent = memo(function SyberiaCardsContent() {
  const pages = SyberiaCards.useSelector(s => s.pages)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {pages.map(page =>
        page.columns.map(column => (
          <ColumnComponent
            key={`${page.id}-${column.id}`}
            pageId={page.id}
            column={column}
          />
        ))
      )}
    </div>
  )
})

const ColumnComponent = memo(function ColumnComponent({
  column,
  pageId,
}: {
  column: Column
  pageId: string
}) {
  return (
    <div className="min-w-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
      <h2 className="font-semibold text-lg mb-2 text-foreground">{column.title}</h2>
      <div className="flex flex-col gap-2">
        {column.cards.map(card => (
          <CardComponent
            key={card.id}
            pageId={pageId}
            columnId={column.id}
            card={card}
          />
        ))}
      </div>
    </div>
  )
})

const CardComponent = memo(function CardComponent({
  card,
  pageId,
  columnId,
}: {
  card: Card
  pageId: string
  columnId: string
}) {
  const [store] = SyberiaCards.useStore()
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [editTitle, setEditTitle] = useState("")

  const cardState = SyberiaCards.useSelector(s => {
    const page = s.pages.find(item => item.id === pageId)
    if (!page) return undefined
    const col = page.columns.find(c => c.cards.some(cd => cd.id === card.id))
    return col?.cards.find(c => c.id === card.id)
  })

  // Check if title is being updated asynchronously
  // The derived computation runs under the transition that triggered the state change
  const toggleTransition: Transition = [
    pageId,
    columnId,
    card.id,
    "toggle-card",
  ]
  const renameTransition: Transition = [
    pageId,
    columnId,
    card.id,
    "rename-card",
  ]
  const isToggling = SyberiaCards.useTransition(toggleTransition)
  const isRenaming = SyberiaCards.useTransition(renameTransition)
  const isUpdatingTitle = isToggling || isRenaming

  if (!cardState) return null

  const handleRename = () => {
    if (editTitle.trim()) {
      store.dispatch({
        type: "rename-card",
        pageId,
        cardId: card.id,
        title: editTitle.trim(),
        transition: renameTransition,
      })
      setMode("view")
      setEditTitle("")
    }
  }

  const handleCancelRename = () => {
    setMode("view")
    setEditTitle("")
  }

  const handleToggle = () => {
    store.dispatch({
      type: "toggle-card",
      pageId,
      cardId: card.id,
      transition: toggleTransition,
    })
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded p-3 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={cardState.done}
          onCheckedChange={handleToggle}
          disabled={isUpdatingTitle}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex-1 text-sm text-foreground ${
                cardState.done
                  ? "line-through text-gray-500 dark:text-gray-400"
                  : ""
              } ${isUpdatingTitle ? "opacity-50" : ""}`}
            >
              {cardState.title}
              {isUpdatingTitle && (
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                  (updating...)
                </span>
              )}
            </span>
          </div>
          {mode === "edit" ? (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleRename()
                  } else if (e.key === "Escape") {
                    handleCancelRename()
                  }
                }}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-background text-foreground"
                disabled={isUpdatingTitle}
                autoFocus
              />
              <Button
                onClick={handleRename}
                disabled={isUpdatingTitle}
                className="h-7 px-2 text-xs"
              >
                Save
              </Button>
              <Button
                onClick={handleCancelRename}
                disabled={isUpdatingTitle}
                className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex justify-end">
              <Button
                onClick={() => {
                  setEditTitle(stripPrefix(cardState.title))
                  setMode("edit")
                }}
                disabled={isUpdatingTitle}
                className="h-6 px-2 text-xs bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
