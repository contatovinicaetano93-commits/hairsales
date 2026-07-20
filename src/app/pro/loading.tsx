export default function ProLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-border/60" />
      <div className="h-32 w-full animate-pulse rounded-3xl bg-border/40" />
      <div className="h-32 w-full animate-pulse rounded-3xl bg-border/40" />
    </div>
  )
}
