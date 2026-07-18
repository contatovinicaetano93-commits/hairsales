'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProviderOpt {
  id: string
  label: string
  available: boolean
}

export default function ProConectarPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderOpt[]>([])
  const [provider, setProvider] = useState('avec')
  const [displayName, setDisplayName] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [unitId, setUnitId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/me/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          window.location.assign('/pro/login')
          return
        }
        setDisplayName(json.data?.subscriber?.display_name ?? '')
      })
      .catch(() => window.location.assign('/pro/login'))

    fetch('/api/me/connect', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.providers) setProviders(json.data.providers)
      })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/me/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          display_name: displayName,
          api_token: apiToken,
          unit_external_id: unitId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Falha ao conectar')
        return
      }
      setSuccess(
        `Conectado como ${json.data.connection.professional_name}. Só os seus dados entram no app.`,
      )
      setTimeout(() => router.push('/pro/hoje'), 900)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="font-serif text-xl">Conectar agenda</h2>
      <p className="mt-2 text-sm text-muted">
        Preencha o nome do assinante e o token da API. A ferramenta puxa apenas o que for desse
        profissional — nunca o salão inteiro.
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Fonte</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          >
            {(providers.length ? providers : [{ id: 'avec', label: 'Avec', available: true }]).map(
              (p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.label}
                  {!p.available ? ' (em breve)' : ''}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">
            Nome do assinante (igual na agenda)
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="Ex.: Dani Mariniello"
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Token da API</span>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            required
            placeholder="Token Avec (ou mock em dev)"
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
            autoComplete="off"
          />
          <span className="text-xs text-muted">
            Em desenvolvimento com mock: use o token <code className="text-gold-strong">mock</code>.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">ID da unidade (opcional)</span>
          <input
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="site / unidade no Avec"
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? 'Validando nome na API…' : 'Conectar meus dados'}
        </button>
      </form>
    </div>
  )
}
