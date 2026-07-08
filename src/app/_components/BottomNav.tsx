'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/contatos', label: 'Contatos', icon: Users },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-md md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-xs"
            >
              {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-gold" />}
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? 'text-gold' : 'text-muted'}
              />
              <span className={`tracking-wide ${active ? 'text-gold' : 'text-muted'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
