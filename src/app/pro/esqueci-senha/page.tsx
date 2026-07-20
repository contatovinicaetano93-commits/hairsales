'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getProBrand } from '@/lib/pro/brand'
import { apiJson } from '@/lib/api-client'

export default function ProEsqueciSenhaPage() {
  const brand = getProBrand()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiJson('/api/pro/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível enviar o e-mail')
      return
    }
    setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Link href="/pro/login" className="text-sm font-semibold text-gold-strong hover:underline">
        ← Voltar
      </Link>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-gold-strong">
          {brand.productLine}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight">Esqueci minha senha</h1>
      </div>

      {sent ? (
        <p className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha. Confira sua
          caixa de entrada (e o spam).
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">Seu e-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-[#1a1714] disabled:opacity-60"
          >
            {loading ? 'Enviando…' : 'Enviar link de redefinição'}
          </button>
        </form>
      )}
    </div>
  )
}
