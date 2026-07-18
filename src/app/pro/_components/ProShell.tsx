'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Users, Sparkles, Link2 } from 'lucide-react'
import { getBrand } from '@/lib/brand'

const NAV = [
  { href: '/pro/hoje', label: 'Hoje', icon: CalendarDays },
  { href: '/pro/clientes', label: 'Clientes', icon: Users },
  { href: '/pro/acoes', label: 'Ações', icon: Sparkles },
  { href: '/pro/conectar', label: 'Conectar', icon: Link2 },
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
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-gold">{brand.aiPersonaName}</p>
        <h1 className="mt-1 font-serif text-2xl tracking-tight text-foreground">{brand.displayName}</h1>
        <p className="mt-1 max-w-md text-sm text-muted">Sua agenda, seus clientes, suas metas.</p>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
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
