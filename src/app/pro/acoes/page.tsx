'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

  useEffect(() => {
    fetch('/api/me/actions', { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json()
        if (res.status === 401) {
          window.location.assign('/pro/login')
          return
        }
        if (!res.ok || json.error) {
          setError(json.error ?? 'Erro')
          return
        }
        setData(json.data)
      })
      .catch((e) => setError(String(e)))

    fetch('/api/me/whatsapp', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setWaConnected(Boolean(json.data.connected))
          setPlan(json.data.plan)
        }
      })
      .catch(() => {})
  }, [])

  async function sendWa(kind: 'reminder' | 'reactivation', clientId: string) {
    setSending(`${kind}-${clientId}`)
    setToast(null)
    try {
      const res = await fetch('/api/me/whatsapp/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, client_id: clientId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setToast(json.error ?? 'Falha no envio')
        return
      }
      setToast(kind === 'reminder' ? 'Lembrete utility enviado.' : 'Reativação marketing enviada.')
    } catch (e) {
      setToast(String(e))
    } finally {
      setSending(null)
    }
  }

  if (error) return <p className="text-sm font-medium text-danger">{error}</p>
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
            <ProEmptyRow colSpan={4}>Ninguém sumido há 45+ dias na sua base.</ProEmptyRow>
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
            <ProEmptyRow colSpan={4}>Nenhuma sugestão de retorno agora.</ProEmptyRow>
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
