'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingChecklist } from '@/app/pro/_components/OnboardingChecklist'

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

      <div className="mt-6 mb-2">
        <OnboardingChecklist />
      </div>

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
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [stripeProPrice, setStripeProPrice] = useState(false)
  const [hasCustomer, setHasCustomer] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('plan') === 'success') setMsg('Pagamento Pro recebido — atualizando plano…')
    if (params.get('plan') === 'cancel') setMsg('Checkout Pro cancelado.')

    Promise.all([
      fetch('/api/me/plan', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/me/onboarding', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([planJson, onboardingJson]) => {
        if (planJson.data?.plan) setPlan(planJson.data.plan)
        setAllowed(Boolean(planJson.data?.self_upgrade_allowed))
        setStripeEnabled(Boolean(planJson.data?.stripe_enabled))
        setStripeProPrice(Boolean(planJson.data?.stripe_pro_price_configured))
        setHasCustomer(Boolean(onboardingJson.data?.has_stripe_customer))
        if (params.get('plan') === 'success' && planJson.data?.plan === 'pro') {
          setMsg('Plano Pro ativo via Stripe.')
        }
      })
      .catch(() => {})
  }, [])

  async function openPortal() {
    setMsg(null)
    const res = await fetch('/api/me/billing/portal', {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error ?? 'Portal indisponível')
      return
    }
    window.location.assign(json.data.url)
  }

  async function setTo(next: 'free' | 'pro', checkout = false) {
    setMsg(null)
    const res = await fetch('/api/me/plan', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: next, checkout }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error ?? 'Erro')
      return
    }
    if (json.data?.mode === 'stripe' && json.data.checkout_url) {
      window.location.assign(json.data.checkout_url)
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
      <div className="mt-3 flex flex-wrap gap-2">
        {plan !== 'pro' && stripeEnabled && stripeProPrice && (
          <button
            type="button"
            onClick={() => setTo('pro', true)}
            className="rounded-xl bg-gold px-3 py-2 text-sm font-semibold"
          >
            Assinar Pro (Stripe)
          </button>
        )}
        {plan !== 'pro' && allowed && (
          <button
            type="button"
            onClick={() => setTo('pro', false)}
            className="rounded-xl bg-gold/15 px-3 py-2 text-sm font-medium text-gold-strong"
          >
            Ativar Pro (demo)
          </button>
        )}
        {plan === 'pro' && allowed && (
          <button
            type="button"
            onClick={() => setTo('free', false)}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            Voltar Free
          </button>
        )}
        {stripeEnabled && hasCustomer && (
          <button
            type="button"
            onClick={openPortal}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            Gerenciar cobrança (Portal)
          </button>
        )}
      </div>
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
    marketing_pack_credits?: number
    marketing_remaining?: number
  } | null>(null)
  const [packs, setPacks] = useState<Array<{ id: string; credits: number; label: string; amount_cents: number }>>(
    [],
  )
  const [embedded, setEmbedded] = useState<{
    enabled: boolean
    app_id: string | null
    config_id: string | null
    setup_hint?: string
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
          setPacks(json.data.packs ?? [])
          setEmbedded(json.data.embedded_signup ?? null)
          if (json.data.embedded_signup && !json.data.embedded_signup.enabled) {
            // hint available via setup_hint when user clicks
          }
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('pack') === 'success') setMsg('Pagamento do pack confirmado — créditos em breve/já creditados.')
    if (params.get('pack') === 'cancel') setMsg('Checkout do pack cancelado.')
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

  async function buyPack(packId: string) {
    setError(null)
    setMsg(null)
    const res = await fetch('/api/me/whatsapp/packs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_id: packId }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Falha na compra')
      return
    }
    if (json.data?.mode === 'stripe' && json.data.checkout_url) {
      window.location.assign(json.data.checkout_url)
      return
    }
    setMsg(`Pack +${json.data.credits_added} créditos de marketing (demo).`)
    reload()
  }

  async function launchEmbeddedSignup() {
    setError(null)
    if (!embedded?.enabled || !embedded.app_id || !embedded.config_id) {
      setError(
        embedded?.setup_hint ||
          'Embedded Signup não configurado (META_APP_ID / META_EMBEDDED_SIGNUP_CONFIG_ID / META_APP_SECRET).',
      )
      return
    }

    const w = window as Window & {
      FB?: {
        init: (o: Record<string, unknown>) => void
        login: (cb: (r: { authResponse?: { code?: string } }) => void, o: Record<string, unknown>) => void
      }
      fbAsyncInit?: () => void
    }

    const run = () => {
      if (!w.FB) return
      w.FB.init({ appId: embedded.app_id!, autoLogAppEvents: true, xfbml: true, version: 'v21.0' })
      w.FB.login(
        (response) => {
          const code = response.authResponse?.code
          if (!code) {
            setError('Embedded Signup cancelado ou sem code.')
            return
          }
          fetch('/api/me/whatsapp/embedded-signup', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })
            .then((r) => r.json())
            .then((json) => {
              if (json.error) {
                setError(json.error)
                return
              }
              setMsg('WhatsApp conectado via Embedded Signup.')
              reload()
            })
            .catch((e) => setError(String(e)))
        },
        {
          config_id: embedded.config_id,
          response_type: 'code',
          override_default_response_type: true,
        },
      )
    }

    if (w.FB) {
      run()
      return
    }

    w.fbAsyncInit = run
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      document.body.appendChild(script)
    }
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
          Utility: {usage.utility_sent}/{usage.utility_included} · Marketing restante:{' '}
          {usage.marketing_remaining ?? 0}
          {usage.marketing_pack_credits != null
            ? ` (packs: ${usage.marketing_pack_credits})`
            : ''}
        </p>
      )}

      {plan === 'pro' && packs.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted">Packs marketing</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => buyPack(p.id)}
                className="rounded-xl border border-border px-3 py-2 text-xs"
              >
                {p.label} · R$ {(p.amount_cents / 100).toFixed(0)}
              </button>
            ))}
          </div>
        </div>
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
        <div className="mt-4 flex flex-col gap-3">
          {embedded?.enabled && (
            <button
              type="button"
              onClick={launchEmbeddedSignup}
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold"
            >
              Conectar com Meta (Embedded Signup)
            </button>
          )}
          <form onSubmit={connect} className="flex flex-col gap-3">
            <p className="text-xs text-muted">Ou cole as credenciais manualmente:</p>
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
            <button
              type="submit"
              className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-strong"
            >
              Conectar WhatsApp Cloud
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {msg && <p className="mt-2 text-sm text-success">{msg}</p>}
    </section>
  )
}

function moneyBrl(n: number | null) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function GoalsBlock() {
  const [daily, setDaily] = useState('')
  const [weekly, setWeekly] = useState('')
  const [savedDaily, setSavedDaily] = useState<number | null>(null)
  const [savedWeekly, setSavedWeekly] = useState<number | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/me/goals', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const d =
          json.data?.daily_goal_revenue != null ? Number(json.data.daily_goal_revenue) : null
        const w =
          json.data?.weekly_goal_revenue != null ? Number(json.data.weekly_goal_revenue) : null
        setSavedDaily(d)
        setSavedWeekly(w)
        if (d != null) setDaily(String(d))
        if (w != null) setWeekly(String(w))
      })
      .catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setJustSaved(false)
    setSaving(true)
    try {
      const nextDaily = daily === '' ? null : Number(daily)
      const nextWeekly = weekly === '' ? null : Number(weekly)
      const res = await fetch('/api/me/goals', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_goal_revenue: nextDaily,
          weekly_goal_revenue: nextWeekly,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Erro ao salvar metas')
        return
      }
      const d =
        json.data?.daily_goal_revenue != null ? Number(json.data.daily_goal_revenue) : nextDaily
      const w =
        json.data?.weekly_goal_revenue != null ? Number(json.data.weekly_goal_revenue) : nextWeekly
      setSavedDaily(d)
      setSavedWeekly(w)
      setJustSaved(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const hasSaved = savedDaily != null || savedWeekly != null

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h3 className="font-serif text-lg">Suas metas</h3>
      <p className="mt-1 text-sm text-muted">Só as suas — não a meta do salão.</p>

      {hasSaved && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-gold-strong">Meta salva agora</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Dia {moneyBrl(savedDaily)} · Semana {moneyBrl(savedWeekly)}
          </p>
        </div>
      )}

      {!hasSaved && (
        <p className="mt-4 text-sm text-muted">Nenhuma meta salva ainda — preencha e salve abaixo.</p>
      )}

      <form onSubmit={save} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted">Meta diária (R$)</span>
          <input
            type="number"
            min={0}
            step={50}
            value={daily}
            onChange={(e) => {
              setDaily(e.target.value)
              setJustSaved(false)
            }}
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
            onChange={(e) => {
              setWeekly(e.target.value)
              setJustSaved(false)
            }}
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        </label>

        {justSaved && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            Meta salva: dia {moneyBrl(savedDaily)} · semana {moneyBrl(savedWeekly)}
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Salvar metas'}
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
