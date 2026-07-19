'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProBrand } from '@/lib/pro/brand'

export default function CompletarCadastroPage() {
  const brand = getProBrand()
  const [sessionId, setSessionId] = useState('')
  const [email, setEmail] = useState('')
  const [planLabel, setPlanLabel] = useState('')
  const [priceLabel, setPriceLabel] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('session_id')?.trim() ?? ''
    setSessionId(id)
    if (!id) {
      setError('Link inválido. Volte à landing e assine novamente.')
      setBooting(false)
      return
    }
    fetch(`/api/pro/checkout/complete?session_id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
          return
        }
        setEmail(json.data.email)
        setPlanLabel(json.data.plan_label)
        setPriceLabel(json.data.price_label)
        if (!json.data.paid) setError('Pagamento ainda não confirmado. Aguarde alguns segundos e recarregue.')
      })
      .catch((e) => setError(String(e)))
      .finally(() => setBooting(false))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pro/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          display_name: displayName,
          password,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha ao concluir cadastro')
        return
      }
      window.location.assign('/pro/conectar')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-gold-strong">{brand.name}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">Concluir cadastro</h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Pagamento confirmado. Defina seu nome na agenda e a senha de acesso.
      </p>

      {booting ? (
        <p className="mt-6 text-sm text-muted">Validando pagamento…</p>
      ) : (
        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-[0_20px_50px_-28px_rgba(26,23,20,0.45)]"
        >
          {(planLabel || email) && (
            <div className="rounded-2xl border border-gold/30 bg-gold/10 px-3 py-3 text-sm font-medium">
              {planLabel && (
                <p>
                  Plano <span className="font-bold text-gold-strong">{planLabel}</span>
                  {priceLabel ? ` · ${priceLabel}` : ''}
                </p>
              )}
              {email && <p className="mt-1 text-muted">{email}</p>}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
              Seu nome na agenda
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Como está no Avec / Trinks"
              className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-medium outline-none focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm font-medium outline-none focus:border-gold"
            />
          </label>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !sessionId}
            className="mt-1 rounded-2xl bg-gold px-4 py-3.5 text-sm font-bold disabled:opacity-60"
          >
            {loading ? 'Criando conta…' : 'Criar conta e conectar agenda'}
          </button>

          <p className="text-center text-xs text-muted">
            Já concluiu?{' '}
            <Link href="/pro/login" className="font-semibold text-gold-strong hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}
