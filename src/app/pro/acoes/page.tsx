'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  const [plan, setPlan] = useState('free')

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

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!data) return <p className="text-sm text-muted">Carregando ações…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-serif text-2xl">Ações</h2>
        <p className="mt-1 text-sm text-muted">Reativação e upsell só da sua carteira.</p>
        {plan === 'pro' && !waConnected && (
          <p className="mt-2 text-xs text-muted">
            WhatsApp Cloud não conectado —{' '}
            <Link href="/pro/conectar" className="text-gold-strong hover:underline">
              conectar
            </Link>
          </p>
        )}
        {toast && <p className="mt-2 text-xs text-muted">{toast}</p>}
      </div>

      <section>
        <h3 className="font-serif text-lg">Reativação</h3>
        {data.reactivation.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Ninguém sumido há 45+ dias na sua base.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.reactivation.map((r) => (
              <li key={r.id} className="rounded-xl bg-surface px-3 py-3">
                <p className="text-sm font-medium">{r.name ?? 'Cliente'}</p>
                <p className="text-xs text-muted">
                  Sumiu há {r.days_gone} dias
                  {r.last_service_name ? ` · ${r.last_service_name}` : ''}
                </p>
                {waConnected && r.phone && (
                  <button
                    type="button"
                    disabled={sending === `reactivation-${r.id}`}
                    onClick={() => sendWa('reactivation', r.id)}
                    className="mt-2 text-xs font-medium text-gold-strong hover:underline disabled:opacity-50"
                  >
                    Enviar WhatsApp (marketing)
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-serif text-lg">Upsell / retorno</h3>
        {data.upsell.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhuma sugestão de retorno agora.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.upsell.map((u) => (
              <li key={`${u.client_id}-${u.service_name}`} className="rounded-xl bg-surface px-3 py-3">
                <p className="text-sm font-medium">{u.client_name ?? 'Cliente'}</p>
                <p className="text-xs text-muted">Sugerir {u.service_name}</p>
                {waConnected && (
                  <button
                    type="button"
                    disabled={sending === `reminder-${u.client_id}`}
                    onClick={() => sendWa('reminder', u.client_id)}
                    className="mt-2 text-xs font-medium text-gold-strong hover:underline disabled:opacity-50"
                  >
                    Enviar lembrete (utility)
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/pro/hoje" className="text-sm text-gold-strong hover:underline">
        Voltar ao Hoje
      </Link>
    </div>
  )
}
