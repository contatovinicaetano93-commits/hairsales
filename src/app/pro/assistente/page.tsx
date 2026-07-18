'use client'

import { useCallback, useEffect, useState } from 'react'

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
    const res = await fetch('/api/me/assistant', { credentials: 'include' })
    const json = await res.json()
    if (res.status === 401) {
      window.location.assign('/pro/login')
      return
    }
    if (!res.ok || json.error) {
      setError(json.error ?? 'Erro')
      return
    }
    setMessages(
      (json.data.history as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    )
    setQuotas(json.data.quotas)
  }, [])

  useEffect(() => {
    load().catch((e) => setError(String(e)))
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setLoading(true)
    setError(null)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    try {
      const res = await fetch('/api/me/assistant', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha')
        return
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: json.data.answer }])
      setQuotas(json.data.quotas)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function runBriefing() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/me/briefing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ push_telegram: true }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha no briefing')
        return
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: json.data.briefing },
      ])
      setQuotas(json.data.quotas)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-2xl">Assistente</h2>
        <p className="mt-1 text-sm text-muted">
          Pergunte sobre sua agenda, meta e clientes — só os seus dados.
        </p>
        {quotas && (
          <p className="mt-2 text-xs text-muted">
            IA hoje: {quotas.daily_used}/{quotas.daily_limit} · plano {quotas.plan}
            {quotas.daily_remaining === 0 ? ' · cota do dia esgotada (KPIs seguem ok)' : ''}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={runBriefing}
        disabled={loading}
        className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm font-medium text-gold-strong disabled:opacity-60"
      >
        Gerar briefing da manhã
      </button>

      <div className="flex min-h-[280px] flex-col gap-3 rounded-2xl border border-border bg-surface/50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Ex.: “Como está minha meta?” · “Quem reativar?” · “Quantos horários tenho hoje?”
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'ml-auto bg-gold/20 text-foreground'
                  : 'mr-auto bg-card border border-border'
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte à assistente…"
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
