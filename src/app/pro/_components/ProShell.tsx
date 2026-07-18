'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Users,
  Sparkles,
  MessageCircle,
  Link2,
  LogOut,
} from 'lucide-react'
import { getBrand } from '@/lib/brand'

const NAV = [
  { href: '/pro/hoje', label: 'Hoje', icon: CalendarDays },
  { href: '/pro/assistente', label: 'Assistente', icon: MessageCircle },
  { href: '/pro/clientes', label: 'Clientes', icon: Users },
  { href: '/pro/acoes', label: 'Ações', icon: Sparkles },
  { href: '/pro/conectar', label: 'Conectar', icon: Link2 },
]

const PAGE_TITLE: Record<string, string> = {
  '/pro/hoje': 'Hoje',
  '/pro/assistente': 'Assistente',
  '/pro/clientes': 'Clientes',
  '/pro/acoes': 'Ações',
  '/pro/conectar': 'Conectar',
}

async function logout() {
  await fetch('/api/pro/auth/logout', { method: 'POST', credentials: 'include' })
  window.location.assign('/pro/login')
}

function NavLinks({
  pathname,
  orientation,
}: {
  pathname: string
  orientation: 'bottom' | 'side'
}) {
  const items = orientation === 'bottom' ? NAV.filter((n) => n.href !== '/pro/conectar') : NAV

  return (
    <ul
      className={
        orientation === 'bottom'
          ? 'mx-auto grid max-w-lg grid-cols-4 gap-0.5 px-1 py-2'
          : 'flex flex-col gap-1 px-2 py-2'
      }
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <li key={href}>
            <Link
              href={href}
              className={
                orientation === 'bottom'
                  ? `flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition ${
                      active ? 'bg-gold/20 text-gold-strong' : 'text-muted hover:text-foreground'
                    }`
                  : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-gold/20 text-gold-strong shadow-[inset_3px_0_0_0_var(--gold)]'
                        : 'text-muted hover:bg-surface hover:text-foreground'
                    }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function ProShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const brand = getBrand()
  const isAuthPage = pathname === '/pro/login'
  const pageTitle =
    Object.entries(PAGE_TITLE).find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] ??
    brand.displayName

  if (isAuthPage) {
    return (
      <div className="pro-app min-h-screen bg-[linear-gradient(165deg,#f7efe3_0%,#fafaf7_45%,#efe4d2_100%)] px-4 py-10 lg:flex lg:items-center lg:justify-center">
        <div className="w-full lg:max-w-md">{children}</div>
      </div>
    )
  }

  return (
    <div className="pro-app min-h-screen bg-[radial-gradient(110%_70%_at_10%_0%,#f3e6d4_0%,#fafaf7_42%,#f0e6d6_100%)] text-foreground lg:flex">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-card/80 lg:shadow-[8px_0_32px_-24px_rgba(26,23,20,0.45)] lg:backdrop-blur-md">
        <div className="border-b border-border px-5 py-6">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-gold-strong">
            {brand.aiPersonaName}
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight">{brand.displayName}</h1>
          <p className="mt-2 text-xs font-semibold text-muted">Só os seus dados.</p>
        </div>
        <nav className="flex-1 py-3">
          <NavLinks pathname={pathname} orientation="side" />
        </nav>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card/70 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md lg:px-8 lg:pb-5 lg:pt-6">
          <div className="mx-auto flex w-full max-w-lg items-start justify-between gap-3 lg:max-w-4xl">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-gold-strong lg:hidden">
                {brand.aiPersonaName}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-foreground lg:mt-0 lg:text-[1.85rem]">
                <span className="lg:hidden">{brand.displayName}</span>
                <span className="hidden lg:inline">{pageTitle}</span>
              </h1>
              <p className="mt-1 max-w-md text-sm font-medium text-muted lg:hidden">
                Sua agenda, seus clientes, suas metas.
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2 lg:hidden">
              <Link
                href="/pro/conectar"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-strong"
                aria-label="Conectar agenda"
              >
                <Link2 className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold text-muted transition hover:border-gold/40 hover:text-foreground"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-4xl lg:px-8 lg:pb-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
          <NavLinks pathname={pathname} orientation="bottom" />
        </nav>
      </div>
    </div>
  )
}
