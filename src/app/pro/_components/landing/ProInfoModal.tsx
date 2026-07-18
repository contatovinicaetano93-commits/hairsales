'use client'

import { useEffect, useId, useState } from 'react'
import { Check, X } from 'lucide-react'
import {
  COMO_FUNCIONA_STEPS,
  CONTATO,
  DUVIDAS,
  PRODUCT_TABS,
  SOBRE,
  type LandingModalId,
} from './landing-content'

export function ProInfoModal({
  openId,
  onClose,
}: {
  openId: LandingModalId | null
  onClose: () => void
}) {
  const titleId = useId()
  const [productTab, setProductTab] = useState(PRODUCT_TABS[0]?.id ?? 'free')

  useEffect(() => {
    if (openId === 'produtos') setProductTab('free')
  }, [openId])

  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [openId, onClose])

  if (!openId) return null

  const titles: Record<LandingModalId, string> = {
    'como-funciona': 'Como funciona',
    produtos: 'Nossos produtos',
    contato: 'Contato',
    duvidas: 'Dúvidas',
    sobre: 'Quem é o Vitrini',
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[color:color-mix(in_srgb,var(--foreground)_42%,transparent)] p-0 animate-fade-in sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[0_24px_80px_-28px_rgba(26,23,20,0.55)] animate-slide-up sm:rounded-3xl sm:animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
          <h2 id={titleId} className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {titles[openId]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-gold/40 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {openId === 'produtos' && (
            <ProductsBody activeTab={productTab} onTabChange={setProductTab} />
          )}
          {openId === 'como-funciona' && <ComoFuncionaBody />}
          {openId === 'duvidas' && <DuvidasBody />}
          {openId === 'contato' && <ContatoBody />}
          {openId === 'sobre' && <SobreBody />}
        </div>
      </div>
    </div>
  )
}

function ProductsBody({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (id: string) => void
}) {
  const tab = PRODUCT_TABS.find((t) => t.id === activeTab) ?? PRODUCT_TABS[0]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {PRODUCT_TABS.map((t) => {
          const active = t.id === tab.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-gold/20 text-gold-strong'
                  : 'bg-surface text-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted">{tab.description}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tab.cards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-border bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-4"
          >
            <h3 className="font-serif text-xl font-bold tracking-tight">{card.title}</h3>
            <p className="mt-1 text-sm font-semibold text-gold-strong">{card.accent}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {card.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm font-medium text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-strong" strokeWidth={2.5} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      {tab.footer && (
        <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold-strong">
              {tab.footer.badge}
            </span>
            <h4 className="font-serif text-lg font-bold">{tab.footer.title}</h4>
          </div>
          <p className="mt-1.5 text-sm font-medium text-muted">{tab.footer.body}</p>
        </div>
      )}
      <p className="text-center text-[0.7rem] font-medium text-muted">
        Assistente Vitrini · Gabriel Vitrini · um profissional por conta
      </p>
    </div>
  )
}

function ComoFuncionaBody() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {COMO_FUNCIONA_STEPS.map((s) => (
        <article
          key={s.step}
          className="rounded-2xl border border-border bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-4"
        >
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-gold-strong">
            Passo {s.step}
          </p>
          <h3 className="mt-2 font-serif text-xl font-bold tracking-tight">{s.title}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{s.body}</p>
        </article>
      ))}
    </div>
  )
}

function DuvidasBody() {
  return (
    <div className="flex flex-col gap-3">
      {DUVIDAS.map((item) => (
        <article key={item.q} className="rounded-2xl border border-border bg-surface/60 px-4 py-4">
          <h3 className="font-serif text-lg font-bold tracking-tight">{item.q}</h3>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{item.a}</p>
        </article>
      ))}
    </div>
  )
}

function ContatoBody() {
  return (
    <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5">
      <h3 className="font-serif text-xl font-bold tracking-tight">{CONTATO.title}</h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-muted">{CONTATO.body}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {CONTATO.points.map((p) => (
          <li key={p} className="flex gap-2 text-sm font-medium">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-strong" strokeWidth={2.5} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SobreBody() {
  return (
    <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5">
      <h3 className="font-serif text-2xl font-bold tracking-tight">{SOBRE.title}</h3>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted">{SOBRE.body}</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {SOBRE.points.map((p) => (
          <li
            key={p}
            className="rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold"
          >
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
