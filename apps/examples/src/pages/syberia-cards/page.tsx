import { createStoreUtils, useNewStore } from "syberia/react"
import { newSyberiaStore } from "syberia"
import { memo, useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"

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
                  .get((done, title) => {
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
        <h1 className="text-2xl font-bold mb-6">Syberia Cards</h1>
        <SyberiaCardsContent />
      </div>
    </SyberiaCards.Context.Provider>
  )
}

const SyberiaCardsContent = memo(function SyberiaCardsContent() {
  const [store] = SyberiaCards.useStore()
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
    <div className="min-w-[300px] bg-gray-100 rounded-lg p-4 flex flex-col gap-2">
      <h2 className="font-semibold text-lg mb-2">{column.title}</h2>
      <div className="flex flex-col gap-2">
        {column.cards.map(card => (
          <CardComponent
            key={card.id}
            pageId={pageId}
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
}: {
  card: Card
  pageId: string
}) {
  const [store] = SyberiaCards.useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")

  const cardState = SyberiaCards.useSelector(s => {
    const page = s.pages.find(item => item.id === pageId)
    if (!page) return undefined
    const col = page.columns.find(c => c.cards.some(cd => cd.id === card.id))
    return col?.cards.find(c => c.id === card.id)
  })

  if (!cardState) return null

  const handleRename = () => {
    if (editTitle.trim()) {
      store.dispatch({
        type: "rename-card",
        pageId,
        cardId: card.id,
        title: editTitle.trim(),
      })
      setIsEditing(false)
      setEditTitle("")
    }
  }

  const handleToggle = () => {
    store.dispatch({
      type: "toggle-card",
      pageId,
      cardId: card.id,
    })
  }

  return (
    <div className="bg-white rounded p-3 shadow-sm border border-gray-200">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={cardState.done}
          onCheckedChange={handleToggle}
          className="mt-1"
        />
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleRename()
                  } else if (e.key === "Escape") {
                    setIsEditing(false)
                    setEditTitle("")
                  }
                }}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
              />
              <Button
                onClick={handleRename}
                className="h-7 px-2 text-xs"
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false)
                  setEditTitle("")
                }}
                className="h-7 px-2 text-xs border border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`flex-1 text-sm ${
                  cardState.done ? "line-through text-gray-500" : ""
                }`}
              >
                {cardState.title}
              </span>
              <Button
                onClick={() => {
                  setEditTitle(stripPrefix(cardState.title))
                  setIsEditing(true)
                }}
                className="h-6 px-2 text-xs bg-transparent text-blue-600 hover:bg-blue-50"
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
