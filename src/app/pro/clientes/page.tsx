'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { apiJson } from '@/lib/api-client'
import { ProEmptyRow, ProPageHeader, ProPanel, ProTable } from '@/app/pro/_components/ProUi'

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

function money(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ProClientesPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    const params = new URLSearchParams({ filter })
    if (q.trim()) params.set('q', q.trim())
    const res = await apiJson<{ clients: ClientRow[] }>(`/api/me/clients?${params}`)
    setLoading(false)
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Erro ao carregar clientes')
      return
    }
    setClients(res.data.clients)
  }, [filter, q])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <ProPageHeader
        title="Meus clientes"
        subtitle="Só a sua carteira — nada do restante do salão."
      />

      <ProPanel>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5">
          <div className="flex flex-wrap gap-2">
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
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                  filter === id
                    ? 'bg-gold text-[#1a1714]'
                    : 'border border-border bg-surface text-muted hover:text-foreground'
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
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium outline-none focus:border-gold"
          />
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
        </div>

        <ProTable columns={['Cliente', 'Telefone', 'Último serviço', 'Última visita', 'Valor']}>
          {loading ? (
            <ProEmptyRow colSpan={5}>Carregando clientes…</ProEmptyRow>
          ) : clients.length === 0 ? (
            <ProEmptyRow colSpan={5}>
              Nenhum cliente ainda.{' '}
              <Link href="/pro/conectar" className="font-bold text-gold-strong underline">
                Conecte a agenda
              </Link>
            </ProEmptyRow>
          ) : (
            clients.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold text-foreground">{c.name ?? 'Sem nome'}</td>
                <td className="px-4 py-3 font-medium text-muted">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-muted">{c.last_service_name ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-muted">
                  {c.last_visit_at
                    ? new Date(c.last_visit_at).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{money(c.last_price)}</td>
              </tr>
            ))
          )}
        </ProTable>
      </ProPanel>
    </div>
  )
}
