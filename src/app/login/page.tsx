'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PrimaryButton } from '../_components/ui'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/admin'
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Senha incorreta')
        return
      }
      router.push(next)
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
      <p className="text-[0.65rem] uppercase tracking-[0.25em] text-gold">ROM Club</p>
      <h1 className="mt-2 text-xl font-semibold">Acesso administrativo</h1>
      <p className="mt-2 text-sm text-muted">Digite a senha definida em ROM_ACCESS_TOKEN.</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Senha</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-gold"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </PrimaryButton>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5">
      <Suspense fallback={<div className="h-48 w-full max-w-sm animate-pulse rounded-2xl bg-card" />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
