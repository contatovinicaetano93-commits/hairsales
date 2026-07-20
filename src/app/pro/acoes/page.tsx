'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { apiJson } from '@/lib/api-client'
import { ProEmptyRow, ProPageHeader, ProPanel, ProTable } from '@/app/pro/_components/ProUi'

export default function ProAcoesPage() {
  const [data, setData] = useState<{
    reactivation: Array<{
      id: string
      name: string | null
      days_gone: number
      last_service_name: string | null
      phone: string | null
    }>
    upsell: Array<{
      client_id: string
      client_name: string | null
      service_name: string
      last_done_at: string
    }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [waConnected, setWaConnected] = useState(false)
  const [plan, setPlan] = useState('standard')

  const load = useCallback(async () => {
    setError(null)
    const actions = await apiJson<NonNullable<typeof data>>('/api/me/actions')
    if (actions.status === 401) return
    if (!actions.ok || !actions.data) {
      setError(actions.error ?? 'Erro ao carregar ações')
      return
    }
    setData(actions.data)

    const wa = await apiJson<{ connected: boolean; plan: string }>('/api/me/whatsapp')
    if (wa.ok && wa.data) {
      setWaConnected(Boolean(wa.data.connected))
      setPlan(wa.data.plan)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function sendWa(kind: 'reminder' | 'reactivation', clientId: string) {
    setSending(`${kind}-${clientId}`)
    setToast(null)
    const res = await apiJson('/api/me/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, client_id: clientId }),
    })
    setSending(null)
    if (res.status === 401) return
    if (!res.ok) {
      setToast(res.error ?? 'Falha no envio')
      return
    }
    setToast(kind === 'reminder' ? 'Lembrete utility enviado.' : 'Reativação marketing enviada.')
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium text-danger">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold"
        >
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!data) return <p className="text-sm font-medium text-muted">Carregando ações…</p>

  return (
    <div className="flex flex-col gap-6">
      <ProPageHeader
        title="Ações"
        subtitle="Reativação e retorno só da sua carteira — nada do salão inteiro."
        action={
          <Link
            href="/pro/hoje"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-gold/40"
          >
            Voltar ao Hoje
          </Link>
        }
      />

      {plan === 'pro' && !waConnected && (
        <p className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2.5 text-sm font-medium text-gold-strong">
          WhatsApp Cloud não conectado —{' '}
          <Link href="/pro/conectar" className="underline underline-offset-2">
            conectar
          </Link>
        </p>
      )}
      {toast && (
        <p className="rounded-xl border border-success/25 bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
          {toast}
        </p>
      )}

      <ProPanel
        title="Reativação"
        subtitle={`${data.reactivation.length} cliente(s) sem visita há 45+ dias`}
      >
        <ProTable columns={['Cliente', 'Sumiu', 'Último serviço', 'Ação']}>
          {data.reactivation.length === 0 ? (
            <ProEmptyRow colSpan={4}>
              Ninguém sumido há 45+ dias na sua base.{' '}
              <Link href="/pro/clientes" className="font-bold text-gold-strong underline">
                Ver seus clientes
              </Link>
            </ProEmptyRow>
          ) : (
            data.reactivation.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold text-foreground">{r.name ?? 'Cliente'}</td>
                <td className="px-4 py-3 font-medium text-muted">{r.days_gone} dias</td>
                <td className="px-4 py-3 font-medium text-muted">{r.last_service_name ?? '—'}</td>
                <td className="px-4 py-3">
                  {waConnected && r.phone ? (
                    <button
                      type="button"
                      disabled={sending === `reactivation-${r.id}`}
                      onClick={() => sendWa('reactivation', r.id)}
                      className="rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-xs font-bold text-gold-strong hover:bg-gold/15 disabled:opacity-50"
                    >
                      WhatsApp
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-muted">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </ProTable>
      </ProPanel>

      <ProPanel
        title="Upsell / retorno"
        subtitle={`${data.upsell.length} sugestão(ões) de retorno por cadência`}
      >
        <ProTable columns={['Cliente', 'Serviço', 'Última vez', 'Ação']}>
          {data.upsell.length === 0 ? (
            <ProEmptyRow colSpan={4}>
              Nenhuma sugestão de retorno agora.{' '}
              <Link href="/pro/hoje" className="font-bold text-gold-strong underline">
                Ver o dia
              </Link>
            </ProEmptyRow>
          ) : (
            data.upsell.map((u) => (
              <tr key={`${u.client_id}-${u.service_name}`}>
                <td className="px-4 py-3 font-semibold text-foreground">
                  {u.client_name ?? 'Cliente'}
                </td>
                <td className="px-4 py-3 font-medium text-muted">{u.service_name}</td>
                <td className="px-4 py-3 font-medium text-muted">
                  {new Date(u.last_done_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  {waConnected ? (
                    <button
                      type="button"
                      disabled={sending === `reminder-${u.client_id}`}
                      onClick={() => sendWa('reminder', u.client_id)}
                      className="rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-xs font-bold text-gold-strong hover:bg-gold/15 disabled:opacity-50"
                    >
                      Lembrete
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-muted">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </ProTable>
      </ProPanel>
    </div>
  )
}
