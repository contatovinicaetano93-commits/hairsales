'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProHojePayload } from '@/lib/pro/hoje'
import { OnboardingChecklist } from '@/app/pro/_components/OnboardingChecklist'

function money(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProHojePage() {
  const [data, setData] = useState<ProHojePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (refresh = false) => {
    setError(null)
    const res = await fetch(`/api/me/hoje${refresh ? '?refresh=1' : ''}`, { credentials: 'include' })
    const json = await res.json()
    if (res.status === 401) {
      window.location.assign('/pro/login')
      return
    }
    if (!res.ok || json.error) {
      setError(json.error ?? 'Erro ao carregar')
      return
    }
    setData(json.data)
  }, [])

  useEffect(() => {
    load().catch((e) => setError(String(e)))
  }, [load])

  if (error) {
    return <p className="text-sm text-danger">{error}</p>
  }

  if (!data) {
    return <p className="text-sm text-muted">Carregando seu dia…</p>
  }

  if (data.connection.status !== 'active') {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-5">
          <h2 className="font-serif text-xl">Conecte sua agenda</h2>
          <p className="mt-2 text-sm text-muted">
            Sem conexão, o app não mostra dados. Informe seu nome e o token da API — só o que for seu
            entra aqui.
          </p>
          <Link
            href="/pro/conectar"
            className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold"
          >
            Ir para Conectar
          </Link>
        </div>
        <OnboardingChecklist />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <OnboardingChecklist compact />
      <div>
        <p className="text-sm text-muted">Olá, {data.subscriber.display_name}</p>
        <h2 className="mt-1 font-serif text-2xl">Hoje</h2>
        <p className="mt-1 text-xs text-muted">
          {data.connection.professional_name} · {data.connection.provider}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface/80 px-3 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted">Faturamento</p>
          <p className="mt-1 text-lg font-semibold">{money(data.metrics.revenue)}</p>
          {data.goals.daily_revenue != null && (
            <p className="mt-1 text-xs text-muted">
              Meta {money(data.goals.daily_revenue)}
              {data.goals.daily_progress_pct != null ? ` · ${data.goals.daily_progress_pct}%` : ''}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-surface/80 px-3 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted">Ticket</p>
          <p className="mt-1 text-lg font-semibold">{money(data.metrics.ticket_avg)}</p>
          <p className="mt-1 text-xs text-muted">{data.metrics.attended} atendidos</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/80 px-3 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted">Agenda</p>
          <p className="mt-1 text-lg font-semibold">{data.metrics.appointments}</p>
          <p className="mt-1 text-xs text-muted">horários hoje</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/80 px-3 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-muted">Ocupação</p>
          <p className="mt-1 text-lg font-semibold">
            {data.metrics.occupancy != null
              ? `${Math.round(data.metrics.occupancy * (data.metrics.occupancy <= 1 ? 100 : 1))}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-muted">{data.leads_hot} leads quentes</p>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-serif text-lg">Agenda</h3>
          <button
            type="button"
            onClick={() => load(true)}
            className="text-xs text-gold-strong underline-offset-2 hover:underline"
          >
            Atualizar
          </button>
        </div>
        {data.agenda.length === 0 ? (
          <p className="text-sm text-muted">Nenhum horário seu hoje.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.agenda.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 border-b border-border/70 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{a.client_name ?? 'Cliente'}</p>
                  <p className="text-xs text-muted">{a.service_name ?? 'Serviço'}</p>
                </div>
                <p className="shrink-0 text-sm text-gold-strong">
                  {a.scheduled_at
                    ? new Date(a.scheduled_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/pro/assistente"
          className="rounded-xl bg-gold/15 px-3 py-2 text-sm font-medium text-gold-strong"
        >
          Abrir assistente
        </Link>
        <Link
          href="/pro/conectar"
          className="rounded-xl border border-border px-3 py-2 text-sm text-muted"
        >
          Metas e Telegram
        </Link>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-serif text-lg">Ações</h3>
          <Link href="/pro/acoes" className="text-xs text-gold-strong hover:underline">
            Ver todas
          </Link>
        </div>
        {data.actions_top.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma ação urgente na sua carteira.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.actions_top.map((a) => (
              <li key={`${a.kind}-${a.client_id}`} className="rounded-xl bg-surface px-3 py-3">
                <p className="text-[0.65rem] uppercase tracking-wide text-gold">
                  {a.kind === 'reactivation' ? 'Reativação' : 'Upsell'}
                </p>
                <p className="mt-1 text-sm font-medium">{a.client_name ?? 'Cliente'}</p>
                <p className="text-xs text-muted">{a.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
