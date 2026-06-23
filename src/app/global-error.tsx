"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
        <h1 className="text-3xl font-bold">Critical Error</h1>
        <p className="text-muted-foreground text-center max-w-md">
          A critical error occurred. Please refresh the page.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => reset()}
        >
          Refresh
        </button>
      </body>
    </html>
  )
}
