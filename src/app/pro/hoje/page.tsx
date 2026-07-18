'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ProHojePayload } from '@/lib/pro/hoje'
import { OnboardingChecklist } from '@/app/pro/_components/OnboardingChecklist'
import {
  ProEmptyRow,
  ProKpi,
  ProPageHeader,
  ProPanel,
  ProTable,
} from '@/app/pro/_components/ProUi'

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
    return <p className="text-sm font-medium text-danger">{error}</p>
  }

  if (!data) {
    return <p className="text-sm font-medium text-muted">Carregando seu dia…</p>
  }

  if (data.connection.status !== 'active') {
    return (
      <div className="flex flex-col gap-4">
        <ProPanel>
          <div className="px-5 py-6">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Conecte sua agenda</h2>
            <p className="mt-2 text-sm font-medium text-muted">
              Sem conexão, o app não mostra dados. Informe seu nome e o token da API — só o que for
              seu entra aqui.
            </p>
            <Link
              href="/pro/conectar"
              className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#1a1714]"
            >
              Ir para Conectar
            </Link>
          </div>
        </ProPanel>
        <OnboardingChecklist />
      </div>
    )
  }

  const occupancy =
    data.metrics.occupancy != null
      ? `${Math.round(data.metrics.occupancy * (data.metrics.occupancy <= 1 ? 100 : 1))}%`
      : '—'

  return (
    <div className="flex flex-col gap-6">
      <OnboardingChecklist compact />

      <ProPageHeader
        title="Hoje"
        subtitle={`${data.subscriber.display_name} · ${data.connection.professional_name} · ${data.connection.provider}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pro/assistente"
              className="rounded-xl bg-gold px-3 py-2 text-sm font-bold text-[#1a1714]"
            >
              Assistente
            </Link>
            <Link
              href="/pro/conectar"
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold"
            >
              Conectar
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ProKpi
          label="Faturamento"
          value={money(data.metrics.revenue)}
          hint={
            data.goals.daily_revenue != null
              ? `Meta ${money(data.goals.daily_revenue)}${
                  data.goals.daily_progress_pct != null ? ` · ${data.goals.daily_progress_pct}%` : ''
                }`
              : undefined
          }
        />
        <ProKpi
          label="Ticket"
          value={money(data.metrics.ticket_avg)}
          hint={`${data.metrics.attended} atendidos`}
        />
        <ProKpi label="Agenda" value={String(data.metrics.appointments)} hint="horários hoje" />
        <ProKpi label="Ocupação" value={occupancy} hint={`${data.leads_hot} leads quentes`} />
      </section>

      <ProPanel
        title="Agenda"
        subtitle="Seus horários de hoje"
        action={
          <button
            type="button"
            onClick={() => load(true)}
            className="text-xs font-bold uppercase tracking-wide text-gold-strong hover:underline"
          >
            Atualizar
          </button>
        }
      >
        <ProTable columns={['Horário', 'Cliente', 'Serviço', 'Valor']}>
          {data.agenda.length === 0 ? (
            <ProEmptyRow colSpan={4}>Nenhum horário seu hoje.</ProEmptyRow>
          ) : (
            data.agenda.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-bold text-gold-strong">
                  {a.scheduled_at
                    ? new Date(a.scheduled_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {a.client_name ?? 'Cliente'}
                </td>
                <td className="px-4 py-3 font-medium text-muted">{a.service_name ?? 'Serviço'}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{money(a.price)}</td>
              </tr>
            ))
          )}
        </ProTable>
      </ProPanel>

      <ProPanel
        title="Ações prioritárias"
        subtitle="Reativação e retorno da sua carteira"
        action={
          <Link
            href="/pro/acoes"
            className="text-xs font-bold uppercase tracking-wide text-gold-strong hover:underline"
          >
            Ver todas
          </Link>
        }
      >
        <ProTable columns={['Tipo', 'Cliente', 'Detalhe']}>
          {data.actions_top.length === 0 ? (
            <ProEmptyRow colSpan={3}>Nenhuma ação urgente na sua carteira.</ProEmptyRow>
          ) : (
            data.actions_top.map((a) => (
              <tr key={`${a.kind}-${a.client_id}`}>
                <td className="px-4 py-3">
                  <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold-strong">
                    {a.kind === 'reactivation' ? 'Reativação' : 'Upsell'}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {a.client_name ?? 'Cliente'}
                </td>
                <td className="px-4 py-3 font-medium text-muted">{a.detail}</td>
              </tr>
            ))
          )}
        </ProTable>
      </ProPanel>
    </div>
  )
}
