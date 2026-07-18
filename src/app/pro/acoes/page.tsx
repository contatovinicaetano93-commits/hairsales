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
  }, [])

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!data) return <p className="text-sm text-muted">Carregando ações…</p>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-serif text-2xl">Ações</h2>
        <p className="mt-1 text-sm text-muted">Reativação e upsell só da sua carteira.</p>
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
