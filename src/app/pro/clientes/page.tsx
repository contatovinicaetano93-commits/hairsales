'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type Filter = 'all' | 'hot' | 'reactivation'

interface ClientRow {
  id: string
  name: string | null
  phone: string | null
  status: string
  last_visit_at: string | null
  last_service_name: string | null
  last_price: number | null
}

export default function ProClientesPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const params = new URLSearchParams({ filter })
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/me/clients?${params}`, { credentials: 'include' })
    const json = await res.json()
    if (res.status === 401) {
      window.location.assign('/pro/login')
      return
    }
    if (!res.ok || json.error) {
      setError(json.error ?? 'Erro')
      return
    }
    setClients(json.data.clients)
  }, [filter, q])

  useEffect(() => {
    load().catch((e) => setError(String(e)))
  }, [load])

  return (
    <div>
      <h2 className="font-serif text-2xl">Meus clientes</h2>
      <p className="mt-1 text-sm text-muted">Só a sua carteira — nada do restante do salão.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'Todos'],
            ['hot', 'Leads quentes'],
            ['reactivation', 'Reativar'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === id ? 'bg-gold/20 text-gold-strong' : 'bg-surface text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar nome ou telefone"
        className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold"
      />

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {clients.length === 0 ? (
          <li className="text-sm text-muted">
            Nenhum cliente ainda.{' '}
            <Link href="/pro/conectar" className="text-gold-strong hover:underline">
              Conecte a agenda
            </Link>
          </li>
        ) : (
          clients.map((c) => (
            <li key={c.id} className="border-b border-border/70 py-3">
              <p className="text-sm font-medium">{c.name ?? 'Sem nome'}</p>
              <p className="text-xs text-muted">
                {c.last_service_name ?? '—'}
                {c.last_visit_at
                  ? ` · última visita ${new Date(c.last_visit_at).toLocaleDateString('pt-BR')}`
                  : ''}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
