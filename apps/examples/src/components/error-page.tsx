type ErrorPageProps = {
  error: unknown
  tryAgain: () => void
}

export function ErrorPage({ error, tryAgain }: ErrorPageProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col items-center gap-2 text-red-600 font-medium">
        <span>
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </span>
        <div className="flex items-center gap-2">
          <span>🤫</span>
          <span className="italic text-black dark:text-white">
            This is intended! Just click try again!
          </span>
        </div>
        <button
          onClick={tryAgain}
          className="bg-red-500 text-white border border-red-600 hover:bg-red-600 hover:border-red-700 focus:outline-none font-medium text-sm transition-all px-4 h-7 rounded-sm outline-none whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
