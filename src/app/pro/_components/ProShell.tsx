'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, Sparkles, MessageCircle, Link2 } from 'lucide-react'
import { getBrand } from '@/lib/brand'

const NAV = [
  { href: '/pro/hoje', label: 'Hoje', icon: CalendarDays },
  { href: '/pro/assistente', label: 'Assistente', icon: MessageCircle },
  { href: '/pro/clientes', label: 'Clientes', icon: Users },
  { href: '/pro/acoes', label: 'Ações', icon: Sparkles },
]

export function ProShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const brand = getBrand()
  const isAuthPage = pathname === '/pro/login'

  if (isAuthPage) {
    return (
      <div className="pro-app min-h-screen bg-[linear-gradient(165deg,#fafaf7_0%,#f3ebe0_50%,#efe4d2_100%)] px-4 py-10">
        {children}
      </div>
    )
  }

  return (
    <div className="pro-app min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-[linear-gradient(165deg,#fafaf7_0%,#f3ebe0_45%,#efe4d2_100%)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-gold">{brand.aiPersonaName}</p>
            <h1 className="mt-1 font-serif text-2xl tracking-tight text-foreground">{brand.displayName}</h1>
            <p className="mt-1 max-w-md text-sm text-muted">Sua agenda, seus clientes, suas metas.</p>
          </div>
          <Link
            href="/pro/conectar"
            className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-strong"
            aria-label="Conectar agenda"
          >
            <Link2 className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-0.5 px-1 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.7rem] transition ${
                    active ? 'bg-gold/15 text-gold-strong' : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
