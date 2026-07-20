'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiJson } from '@/lib/api-client'
import { ProPageHeader, ProPanel } from '../_components/ProUi'

interface Quota {
  daily_used: number
  daily_limit: number
  daily_remaining: number
  plan: string
}

interface Msg {
  role: string
  content: string
}

export default function ProAssistentePage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [quotas, setQuotas] = useState<Quota | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await apiJson<{
      history: Array<{ role: string; content: string }>
      quotas: Quota
    }>('/api/me/assistant')
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Erro ao carregar a assistente')
      return
    }
    setMessages(res.data.history.map((m) => ({ role: m.role, content: m.content })))
    setQuotas(res.data.quotas)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    setError(null)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    const res = await apiJson<{ answer: string; quotas: Quota }>('/api/me/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    })
    setLoading(false)
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Falha ao falar com a assistente')
      return
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.answer }])
    setQuotas(res.data.quotas)
  }

  async function runBriefing() {
    setLoading(true)
    setError(null)
    const res = await apiJson<{ briefing: string; quotas: Quota }>('/api/me/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ push_telegram: true }),
    })
    setLoading(false)
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Falha no briefing')
      return
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: res.data!.briefing }])
    setQuotas(res.data.quotas)
  }

  return (
    <div className="flex flex-col gap-5">
      <ProPageHeader
        title="Assistente"
        subtitle="Pergunte sobre agenda, meta e clientes."
        action={
          <button
            type="button"
            onClick={runBriefing}
            disabled={loading}
            className="rounded-xl border border-gold/40 bg-gold/15 px-3.5 py-2.5 text-sm font-semibold text-gold-strong disabled:opacity-60"
          >
            Briefing da manhã
          </button>
        }
      />

      {quotas && (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-strong">
          IA hoje: {quotas.daily_used}/{quotas.daily_limit} · plano {quotas.plan}
          {quotas.daily_remaining === 0 ? ' · cota do dia esgotada' : ''}
        </p>
      )}

      <ProPanel title="Conversa" subtitle="Histórico do dia">
        <div className="flex min-h-[280px] flex-col gap-3 px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-sm font-medium text-muted">
              Ex.: “Como está minha meta?” · “Quem reativar?” · “Quantos horários tenho hoje?”
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm font-medium whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'ml-auto bg-gold/20 text-foreground'
                    : 'mr-auto border border-border bg-surface'
                }`}
              >
                {m.content}
              </div>
            ))
          )}
        </div>
      </ProPanel>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <form
        onSubmit={send}
        className="flex gap-2 rounded-2xl border border-border bg-card p-3 shadow-[0_8px_28px_-18px_rgba(26,23,20,0.35)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte à assistente…"
          aria-label="Mensagem para a assistente"
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[color:var(--on-gold,#1a1714)] disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
