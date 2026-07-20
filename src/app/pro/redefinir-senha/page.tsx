'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getProBrand } from '@/lib/pro/brand'
import { apiJson } from '@/lib/api-client'

function ResetForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    const res = await apiJson('/api/pro/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível redefinir a senha')
      return
    }
    router.push('/pro/login')
  }

  if (!token) {
    return (
      <p className="text-sm text-danger">
        Link inválido.{' '}
        <Link href="/pro/esqueci-senha" className="underline">
          Pedir um novo
        </Link>
        .
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">Nova senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          aria-label="Nova senha"
          className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-muted">Confirme a nova senha</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          aria-label="Confirmar nova senha"
          className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-[#1a1714] disabled:opacity-60"
      >
        {loading ? 'Salvando…' : 'Redefinir senha'}
      </button>
    </form>
  )
}

export default function ProRedefinirSenhaPage() {
  const brand = getProBrand()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Link href="/pro/login" className="text-sm font-semibold text-gold-strong hover:underline">
        ← Voltar
      </Link>

      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-gold-strong">
          {brand.productLine}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight">Redefinir senha</h1>
      </div>

      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  )
}
