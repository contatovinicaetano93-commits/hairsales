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
          <span className="text-xs uppercase tracking-wide text-muted">
            {provider === 'trinks' ? 'ID do estabelecimento (Trinks)' : 'ID da unidade Avec (opcional)'}
          </span>
          <input
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            placeholder={provider === 'trinks' ? 'estabelecimentoId' : 'site / unidade no Avec'}
            required={provider === 'trinks' && apiToken !== 'mock'}
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

      <PlanBlock />
      <GoalsBlock />
      <TelegramBlock />
      <WhatsappBlock />
    </div>
  )
}

function PlanBlock() {
  const [plan, setPlan] = useState('free')
  const [allowed, setAllowed] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/plan', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.plan) setPlan(json.data.plan)
        setAllowed(Boolean(json.data?.self_upgrade_allowed))
      })
      .catch(() => {})
  }, [])

  async function setTo(next: 'free' | 'pro') {
    setMsg(null)
    const res = await fetch('/api/me/plan', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: next }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error ?? 'Erro')
      return
    }
    setPlan(json.data.plan)
    setMsg(next === 'pro' ? 'Plano Pro ativo — WhatsApp Cloud liberado.' : 'Voltou para Free.')
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h3 className="font-serif text-lg">Plano</h3>
      <p className="mt-1 text-sm text-muted">
        Atual: <span className="font-medium text-foreground">{plan}</span>
        {plan === 'free' ? ' · Telegram + app · sem WhatsApp Cloud' : ' · 200 utility/mês inclusos'}
      </p>
      {allowed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {plan !== 'pro' && (
            <button
              type="button"
              onClick={() => setTo('pro')}
              className="rounded-xl bg-gold/15 px-3 py-2 text-sm font-medium text-gold-strong"
            >
              Ativar Pro (demo)
            </button>
          )}
          {plan === 'pro' && (
            <button
              type="button"
              onClick={() => setTo('free')}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            >
              Voltar Free
            </button>
          )}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </section>
  )
}

function WhatsappBlock() {
  const [plan, setPlan] = useState('free')
  const [connected, setConnected] = useState(false)
  const [usage, setUsage] = useState<{
    utility_sent: number
    utility_included: number
    marketing_sent: number
    marketing_included: number
  } | null>(null)
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    fetch('/api/me/whatsapp', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setPlan(json.data.plan)
          setConnected(Boolean(json.data.connected))
          setUsage(json.data.usage)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    reload()
  }, [])

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMsg(null)
    const res = await fetch('/api/me/whatsapp', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        display_phone: displayPhone || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Erro')
      return
    }
    setMsg('WhatsApp Cloud conectado.')
    setAccessToken('')
    reload()
  }

  async function disconnect() {
    await fetch('/api/me/whatsapp', { method: 'DELETE', credentials: 'include' })
    setConnected(false)
    reload()
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h3 className="font-serif text-lg">WhatsApp Cloud (Pro)</h3>
      <p className="mt-1 text-sm text-muted">
        Número do assinante na Cloud API oficial. Free usa só Telegram. Em dev, token{' '}
        <code className="text-gold-strong">mock</code>.
      </p>
      {usage && plan === 'pro' && (
        <p className="mt-2 text-xs text-muted">
          Utility: {usage.utility_sent}/{usage.utility_included} · Marketing:{' '}
          {usage.marketing_sent}/{usage.marketing_included}
        </p>
      )}
      {connected ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-success">Cloud API conectada.</p>
          <button
            type="button"
            onClick={disconnect}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <form onSubmit={connect} className="mt-4 flex flex-col gap-3">
          <input
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            required
            placeholder="Phone number ID"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
          />
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required
            placeholder="Access token (ou mock)"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
            autoComplete="off"
          />
          <input
            value={displayPhone}
            onChange={(e) => setDisplayPhone(e.target.value)}
            placeholder="Número exibido (opcional)"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          {msg && <p className="text-sm text-success">{msg}</p>}
          <button
            type="submit"
            className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-strong"
          >
            Conectar WhatsApp Cloud
          </button>
        </form>
      )}
    </section>
  )
}

function GoalsBlock() {
  const [daily, setDaily] = useState('')
  const [weekly, setWeekly] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/goals', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.daily_goal_revenue != null) setDaily(String(json.data.daily_goal_revenue))
        if (json.data?.weekly_goal_revenue != null) setWeekly(String(json.data.weekly_goal_revenue))
      })
      .catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const res = await fetch('/api/me/goals', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_goal_revenue: daily === '' ? null : Number(daily),
        weekly_goal_revenue: weekly === '' ? null : Number(weekly),
      }),
    })
    const json = await res.json()
    setMsg(res.ok ? 'Metas salvas.' : json.error ?? 'Erro')
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h3 className="font-serif text-lg">Suas metas</h3>
      <p className="mt-1 text-sm text-muted">Só as suas — não a meta do salão.</p>
      <form onSubmit={save} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Meta diária (R$)</span>
          <input
            type="number"
            min={0}
            step={50}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Meta semanal (R$)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <button type="submit" className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium">
          Salvar metas
        </button>
      </form>
    </section>
  )
}

function TelegramBlock() {
  const [linked, setLinked] = useState(false)
  const [instructions, setInstructions] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me/telegram', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => setLinked(Boolean(json.data?.linked)))
      .catch(() => {})
  }, [])

  async function generate() {
    setError(null)
    const res = await fetch('/api/me/telegram', { method: 'POST', credentials: 'include' })
    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error ?? 'Erro')
      return
    }
    setCode(json.data.code)
    setInstructions(json.data.instructions)
  }

  async function unlink() {
    await fetch('/api/me/telegram', { method: 'DELETE', credentials: 'include' })
    setLinked(false)
    setCode(null)
    setInstructions(null)
  }

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h3 className="font-serif text-lg">Telegram</h3>
      <p className="mt-1 text-sm text-muted">
        Canal grátis da assistente — briefing e perguntas só com os seus dados.
      </p>
      {linked ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-success">Telegram vinculado.</p>
          <button
            type="button"
            onClick={unlink}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          >
            Desvincular
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={generate}
            className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-strong"
          >
            Gerar código de vínculo
          </button>
          {code && (
            <p className="text-sm">
              Código: <span className="font-mono text-gold-strong">{code}</span>
            </p>
          )}
          {instructions && <p className="text-xs text-muted">{instructions}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </section>
  )
}
