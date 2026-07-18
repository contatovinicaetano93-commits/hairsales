import type { ReactNode } from 'react'

export function ProPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div>
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-[2rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-[color:color-mix(in_srgb,var(--muted)_88%,var(--foreground))]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ProPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_28px_-18px_rgba(26,23,20,0.35)] ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/80 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] px-4 py-3.5">
          <div>
            {title && (
              <h3 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-[color:color-mix(in_srgb,var(--muted)_85%,var(--foreground))]">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="px-0 py-0">{children}</div>
    </section>
  )
}

export function ProTable({
  columns,
  children,
  empty,
}: {
  columns: string[]
  children: ReactNode
  empty?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/90">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-gold-strong"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">{children}</tbody>
      </table>
      {empty && (
        <p className="px-4 py-8 text-center text-sm font-medium text-muted">{empty}</p>
      )}
    </div>
  )
}

export function ProEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm font-medium text-muted">
        {children}
      </td>
    </tr>
  )
}

export function ProKpi({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3.5 shadow-[0_6px_20px_-16px_rgba(26,23,20,0.4)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gold-strong">{label}</p>
      <p className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-muted">{hint}</p>}
    </div>
  )
}
