'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBrand } from '@/lib/brand'

export default function ProLoginPage() {
  const brand = getBrand()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const path = mode === 'login' ? '/api/pro/auth/login' : '/api/pro/auth/register'
      const body =
        mode === 'login'
          ? { email, password }
          : { display_name: displayName, email, password }
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha no acesso')
        return
      }
      window.location.assign(mode === 'register' ? '/pro/conectar' : '/pro/hoje')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-[0.65rem] uppercase tracking-[0.25em] text-gold">{brand.aiPersonaName}</p>
      <h2 className="mt-2 font-serif text-2xl">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
      <p className="mt-2 text-sm text-muted">
        Conta do profissional — você só vê os seus dados da agenda.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        {mode === 'register' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Seu nome na agenda</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Como está no Avec / Trinks"
              className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-60"
        >
          {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar e conectar agenda'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="mt-4 text-sm text-gold-strong underline-offset-2 hover:underline"
      >
        {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}
      </button>

      <p className="mt-8 text-xs text-muted">
        Painel da unidade?{' '}
        <Link href="/login" className="text-gold-strong underline-offset-2 hover:underline">
          Acesso da equipe
        </Link>
      </p>
    </div>
  )
}
