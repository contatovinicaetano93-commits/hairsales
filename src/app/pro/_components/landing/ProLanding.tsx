'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { getProBrand } from '@/lib/pro/brand'
import { HERO_CARDS, LANDING_NAV, type LandingModalId } from './landing-content'
import { ProInfoModal } from './ProInfoModal'

type AuthMode = 'login' | 'register'

export function ProLanding() {
  const brand = getProBrand()
  const formRef = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState<LandingModalId | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<'login' | 'register'>('login')

  function openAuth(next: AuthMode) {
    setMode(next)
    setSelectedCard(next)
    setError(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  function onHeroCard(id: (typeof HERO_CARDS)[number]['id']) {
    if (id === 'login' || id === 'register') {
      openAuth(id)
      return
    }
    setModal(id)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const path = mode === 'login' ? '/api/pro/auth/login' : '/api/pro/auth/register'
      const body =
        mode === 'login'
          ? { email, password }
          : { display_name: displayName, email, password }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha no acesso')
        return
      }
      window.location.assign(mode === 'register' ? '/pro/conectar' : '/pro/hoje')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'entrar' || hash === 'login') openAuth('login')
    if (hash === 'criar' || hash === 'register') openAuth('register')
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_-10%,#f0e0c8_0%,transparent_55%),linear-gradient(165deg,#f7efe3_0%,#fafaf7_42%,#ebe2d4_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] opacity-[0.35]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c9a227\' fill-opacity=\'0.07\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <header className="relative z-30 px-3 pt-4 sm:px-5 sm:pt-5">
        <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3 py-2 shadow-[0_12px_40px_-24px_rgba(26,23,20,0.45)] backdrop-blur-md animate-rise sm:gap-3 sm:px-4 sm:py-2.5">
          <div className="min-w-0 shrink-0 px-1">
            <p className="truncate font-serif text-lg font-bold tracking-tight sm:text-xl">
              {brand.shortName}
            </p>
          </div>
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {LANDING_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setModal(item.id)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModal('produtos')}
              className="hidden text-sm font-bold text-gold-strong sm:inline"
            >
              Ver planos
            </button>
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-bold text-background transition hover:bg-foreground/90"
            >
              Entrar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto pb-1 no-scrollbar lg:hidden">
          {LANDING_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModal(item.id)}
              className="shrink-0 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-muted"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <section className="flex flex-col items-center text-center animate-rise">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-gold-strong">
            {brand.name}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-[2.35rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-[3.35rem]">
            Seu dia no salão,{' '}
            <span className="text-gold-strong">organizado</span> pela assistente
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-muted sm:text-lg">
            {brand.tagline} App + Telegram no Free; WhatsApp Cloud no Pro.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-gold-strong" /> Sem visão da unidade
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-gold-strong" /> Avec · Trinks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-gold-strong" /> Telegram incluso
            </span>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Começar">
          {HERO_CARDS.map((card, i) => {
            const active =
              (card.id === 'login' || card.id === 'register') && selectedCard === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onHeroCard(card.id)}
                style={{ animationDelay: `${80 + i * 60}ms` }}
                className={`rounded-2xl border px-4 py-4 text-left transition animate-rise ${
                  active
                    ? 'border-gold bg-card shadow-[0_0_0_2px_color-mix(in_srgb,var(--gold)_35%,transparent)]'
                    : 'border-border bg-card/90 hover:border-gold/50 hover:shadow-[0_12px_32px_-24px_rgba(26,23,20,0.4)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-xl font-bold tracking-tight">{card.title}</p>
                  {active && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[0.65rem] font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-gold-strong">{card.subtitle}</p>
                <p className="mt-2 text-xs font-medium text-muted">{card.detail}</p>
              </button>
            )
          })}
        </section>

        <section
          ref={formRef}
          id="entrar"
          className="mx-auto mt-8 w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-[0_20px_50px_-28px_rgba(26,23,20,0.45)] sm:p-7 animate-rise"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-gold-strong">
                Acesso
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight">
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </h2>
            </div>
            <Sparkles className="h-5 w-5 text-gold-strong" />
          </div>
          <p className="mt-2 text-sm font-medium text-muted">
            Conta do profissional — você só vê os seus dados da agenda.
          </p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                  Seu nome na agenda
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Como está no Avec / Trinks"
                  className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-medium outline-none focus:border-gold"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                E-mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-medium outline-none focus:border-gold"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
                Senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-medium outline-none focus:border-gold"
              />
            </label>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-2xl bg-gold px-4 py-3.5 text-sm font-bold text-foreground disabled:opacity-60"
            >
              {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar e conectar agenda'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => openAuth(mode === 'login' ? 'register' : 'login')}
            className="mt-4 text-sm font-semibold text-gold-strong underline-offset-2 hover:underline"
          >
            {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}
          </button>

          <p className="mt-6 text-xs font-medium text-muted">
            Painel da unidade?{' '}
            <Link href="/login" className="font-bold text-gold-strong underline-offset-2 hover:underline">
              Acesso da equipe
            </Link>
          </p>
        </section>

        <p className="mt-10 text-center text-xs font-medium text-muted">
          {brand.name} · {brand.productLine} · um assinante = um profissional
        </p>
      </main>

      <ProInfoModal openId={modal} onClose={() => setModal(null)} />
    </div>
  )
}
