'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { OnboardingChecklist } from '@/app/pro/_components/OnboardingChecklist'
import { ProPageHeader } from '@/app/pro/_components/ProUi'
import { apiJson } from '@/lib/api-client'

interface ProviderOpt {
  id: string
  label: string
  available: boolean
}

function ConnectCard({
  title,
  summary,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  badge?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <article className="w-full overflow-hidden rounded-3xl border border-border/90 bg-card shadow-[0_10px_32px_-22px_rgba(26,23,20,0.4)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface/50 sm:px-6 sm:py-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg font-bold leading-tight tracking-tight sm:text-xl">
              {title}
            </h3>
            {badge && (
              <span className="rounded-full border border-gold/35 bg-gold/12 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gold-strong">
                {badge}
              </span>
            )}
          </div>
          {summary && (
            <p className="mt-1 text-sm font-medium text-muted">{summary}</p>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border/70 px-5 py-5 sm:px-6">
          {children}
        </div>
      )}
    </article>
  )
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
    apiJson<{ subscriber?: { display_name?: string } }>('/api/me/session').then((res) => {
      if (res.status === 401) return
      if (!res.ok) {
        window.location.assign('/pro/login')
        return
      }
      setDisplayName(res.data?.subscriber?.display_name ?? '')
    })

    apiJson<{ providers?: ProviderOpt[] }>('/api/me/connect').then((res) => {
      if (res.ok && res.data?.providers) setProviders(res.data.providers)
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const res = await apiJson<{ connection: { professional_name: string } }>('/api/me/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        display_name: displayName,
        api_token: apiToken,
        unit_external_id: unitId || null,
      }),
    })
    setLoading(false)
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Falha ao conectar')
      return
    }
    setSuccess(`Conectado como ${res.data.connection.professional_name}.`)
    setTimeout(() => router.push('/pro/hoje'), 900)
  }

  return (
    <div className="-mx-0 flex w-full flex-col gap-4">
      <ProPageHeader
        title="Conectar"
        subtitle="Toque em um card para abrir ou recolher."
      />

      <OnboardingChecklist />

      <div className="flex w-full flex-col gap-3">
        <ConnectCard
          title="Agenda"
          summary="Avec ou Trinks"
          badge="obrigatório"
          defaultOpen
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted">Fonte</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
              >
                {(providers.length
                  ? providers
                  : [{ id: 'avec', label: 'Avec', available: true }]
                ).map((p) => (
                  <option key={p.id} value={p.id} disabled={!p.available}>
                    {p.label}
                    {!p.available ? ' (em breve)' : ''}
                  </option>
                ))}
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
              <span className="text-xs uppercase tracking-wide text-muted">
                Chave de acesso da sua agenda
              </span>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                required
                placeholder="Cole aqui a chave gerada na sua agenda"
                className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
                autoComplete="off"
              />
              {process.env.NODE_ENV !== 'production' && (
                <span className="text-xs text-muted">
                  Ambiente de teste: use o token{' '}
                  <code className="text-gold-strong">mock</code>.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wide text-muted">
                {provider === 'trinks'
                  ? 'ID do estabelecimento (Trinks)'
                  : 'ID da unidade Avec (opcional)'}
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
              {loading ? 'Verificando seu nome na agenda…' : 'Conectar meus dados'}
            </button>
          </form>
        </ConnectCard>

        <PlanBlock />
        <GoalsBlock />
        <TelegramBlock />
        <WhatsappBlock />
        <DeleteAccountBlock />
      </div>
    </div>
  )
}

function DeleteAccountBlock() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiJson('/api/me/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.status === 401 && !confirming) return
    if (!res.ok) {
      setError(res.error ?? 'Não foi possível excluir a conta')
      return
    }
    router.push('/pro/login')
  }

  return (
    <ConnectCard title="Excluir conta" summary="Apaga seus dados permanentemente — sem volta">
      <p className="mb-4 text-sm text-muted">
        Exclui sua conta, clientes cadastrados, histórico da assistente e vínculos de Telegram/WhatsApp.
        Registros fiscais de cobrança são mantidos anonimizados, como exige a lei.
      </p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger"
        >
          Quero excluir minha conta
        </button>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted">
              Confirme sua senha pra excluir
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-label="Senha atual para confirmar exclusão de conta"
              className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-danger"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Excluindo…' : 'Excluir permanentemente'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                setPassword('')
                setError(null)
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </ConnectCard>
  )
}

function PlanBlock() {
  const [plan, setPlan] = useState('standard')
  const [allowed, setAllowed] = useState(false)
  const [stripeEnabled, setStripeEnabled] = useState(false)
  const [stripeProPrice, setStripeProPrice] = useState(false)
  const [hasCustomer, setHasCustomer] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('plan') === 'success') setMsg('Pagamento recebido — atualizando plano…')
    if (params.get('plan') === 'cancel') setMsg('Checkout cancelado.')

    Promise.all([
      apiJson<{
        plan?: string
        self_upgrade_allowed?: boolean
        stripe_enabled?: boolean
        stripe_pro_price_configured?: boolean
      }>('/api/me/plan'),
      apiJson<{ has_stripe_customer?: boolean }>('/api/me/onboarding'),
    ]).then(([planRes, onboardingRes]) => {
      if (planRes.status === 401) return
      if (planRes.data?.plan) setPlan(planRes.data.plan)
      setAllowed(Boolean(planRes.data?.self_upgrade_allowed))
      setStripeEnabled(Boolean(planRes.data?.stripe_enabled))
      setStripeProPrice(Boolean(planRes.data?.stripe_pro_price_configured))
      setHasCustomer(Boolean(onboardingRes.data?.has_stripe_customer))
      if (params.get('plan') === 'success' && planRes.data?.plan === 'pro') {
        setMsg('Plano Pro ativo via Stripe.')
      }
    })
  }, [])

  async function openPortal() {
    setMsg(null)
    const res = await apiJson<{ url: string }>('/api/me/billing/portal', { method: 'POST' })
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setMsg(res.error ?? 'Portal indisponível')
      return
    }
    window.location.assign(res.data.url)
  }

  async function setTo(next: 'standard' | 'pro', checkout = false) {
    setMsg(null)
    const res = await apiJson<{ plan: string; mode?: string; checkout_url?: string }>(
      '/api/me/plan',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: next, checkout }),
      },
    )
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setMsg(res.error ?? 'Erro')
      return
    }
    if (res.data.mode === 'stripe' && res.data.checkout_url) {
      window.location.assign(res.data.checkout_url)
      return
    }
    setPlan(res.data.plan)
    setMsg(next === 'pro' ? 'Plano Pro ativo — WhatsApp liberado.' : 'Voltou para Standard.')
  }

  return (
    <ConnectCard
      title="Plano"
      summary={
        plan === 'standard'
          ? 'Standard · R$ 29,90 · App + Telegram'
          : 'Pro · R$ 199,90 · WhatsApp incluso'
      }
      badge={plan === 'standard' ? 'standard' : 'pro'}
    >
      <div className="flex flex-wrap gap-2">
        {plan !== 'pro' && stripeEnabled && stripeProPrice && (
          <button
            type="button"
            onClick={() => setTo('pro', true)}
            className="rounded-xl bg-gold px-3 py-2 text-sm font-semibold"
          >
            Upgrade Pro · R$ 199,90
          </button>
        )}
        {plan !== 'pro' && allowed && (
          <button
            type="button"
            onClick={() => setTo('pro', false)}
            className="rounded-xl bg-gold/15 px-3 py-2 text-sm font-medium text-gold-strong"
          >
            Ativar Pro
          </button>
        )}
        {plan === 'pro' && allowed && (
          <button
            type="button"
            onClick={() => setTo('standard', false)}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            Voltar Standard
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
      <p className="mt-3 text-xs font-medium text-muted">
        Standard R$ 29,90/mês · Pro R$ 199,90/mês. Painel da equipe não usa estes planos.
      </p>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </ConnectCard>
  )
}

function WhatsappBlock() {
  const [plan, setPlan] = useState('standard')
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
    apiJson<{
      plan: string
      connected: boolean
      usage: typeof usage
      packs?: typeof packs
      embedded_signup?: typeof embedded
    }>('/api/me/whatsapp').then((res) => {
      if (res.status === 401) return
      if (!res.ok || !res.data) {
        setError('Não deu pra carregar o WhatsApp. Tente de novo.')
        return
      }
      setPlan(res.data.plan)
      setConnected(Boolean(res.data.connected))
      setUsage(res.data.usage)
      setPacks(res.data.packs ?? [])
      setEmbedded(res.data.embedded_signup ?? null)
    })
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
    const res = await apiJson('/api/me/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        display_phone: displayPhone || null,
      }),
    })
    if (res.status === 401) return
    if (!res.ok) {
      setError(res.error ?? 'Erro')
      return
    }
    setMsg('WhatsApp conectado.')
    setAccessToken('')
    reload()
  }

  async function disconnect() {
    const res = await apiJson('/api/me/whatsapp', { method: 'DELETE' })
    if (res.status === 401) return
    setConnected(false)
    reload()
  }

  async function buyPack(packId: string) {
    setError(null)
    setMsg(null)
    const res = await apiJson<{ mode?: string; checkout_url?: string; credits_added?: number }>(
      '/api/me/whatsapp/packs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId }),
      },
    )
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Falha na compra')
      return
    }
    if (res.data.mode === 'stripe' && res.data.checkout_url) {
      window.location.assign(res.data.checkout_url)
      return
    }
    setMsg(`Pack +${res.data.credits_added} créditos de marketing.`)
    reload()
  }

  async function launchEmbeddedSignup() {
    setError(null)
    if (!embedded?.enabled || !embedded.app_id || !embedded.config_id) {
      setError(
        embedded?.setup_hint ||
          'Não foi possível iniciar a conexão automática com o WhatsApp agora. Tente colar os dados manualmente, ou fale com o suporte.',
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
            setError('Conexão com o WhatsApp cancelada. Tente de novo.')
            return
          }
          apiJson('/api/me/whatsapp/embedded-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }).then((res) => {
            if (res.status === 401) return
            if (!res.ok) {
              setError(res.error ?? 'Não foi possível conectar o WhatsApp.')
              return
            }
            setMsg('WhatsApp conectado.')
            reload()
          })
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
    <ConnectCard
      title="WhatsApp"
      summary={
        connected
          ? 'WhatsApp conectado'
          : plan === 'pro'
            ? 'Seu número de WhatsApp conectado'
            : 'Disponível no plano Pro'
      }
      badge={connected ? 'ativo' : plan === 'pro' ? 'pro' : 'standard'}
    >
      <p className="text-sm text-muted">
        No plano Standard, os avisos vão pelo Telegram.
        {process.env.NODE_ENV !== 'production' && (
          <>
            {' '}
            Ambiente de teste: use o token <code className="text-gold-strong">mock</code>.
          </>
        )}
      </p>
      {usage && plan === 'pro' && (
        <p className="mt-2 text-xs text-muted">
          Lembretes enviados: {usage.utility_sent}/{usage.utility_included} · Mensagens de
          reativação restantes:{' '}
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
          <p className="text-sm text-success">WhatsApp conectado.</p>
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
              Conectar com Meta
            </button>
          )}
          <form onSubmit={connect} className="flex flex-col gap-3">
            <p className="text-xs text-muted">Ou cole os dados de acesso manualmente:</p>
            <input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
              placeholder="ID do número de telefone"
              aria-label="ID do número de telefone do WhatsApp"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
              placeholder="Token de acesso"
              aria-label="Token de acesso do WhatsApp"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
              autoComplete="off"
            />
            <input
              value={displayPhone}
              onChange={(e) => setDisplayPhone(e.target.value)}
              placeholder="Número exibido (opcional)"
              aria-label="Número de WhatsApp exibido para os clientes"
              className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-strong"
            >
              Conectar WhatsApp
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {msg && <p className="mt-2 text-sm text-success">{msg}</p>}
    </ConnectCard>
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
    apiJson<{ daily_goal_revenue?: number | null; weekly_goal_revenue?: number | null }>(
      '/api/me/goals',
    ).then((res) => {
      if (res.status === 401) return
      if (!res.ok || !res.data) return
      const d = res.data.daily_goal_revenue != null ? Number(res.data.daily_goal_revenue) : null
      const w = res.data.weekly_goal_revenue != null ? Number(res.data.weekly_goal_revenue) : null
      setSavedDaily(d)
      setSavedWeekly(w)
      if (d != null) setDaily(String(d))
      if (w != null) setWeekly(String(w))
    })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setJustSaved(false)
    setSaving(true)
    const nextDaily = daily === '' ? null : Number(daily)
    const nextWeekly = weekly === '' ? null : Number(weekly)
    const res = await apiJson<{ daily_goal_revenue?: number | null; weekly_goal_revenue?: number | null }>(
      '/api/me/goals',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_goal_revenue: nextDaily,
          weekly_goal_revenue: nextWeekly,
        }),
      },
    )
    setSaving(false)
    if (res.status === 401) return
    if (!res.ok) {
      setError(res.error ?? 'Erro ao salvar metas')
      return
    }
    const d = res.data?.daily_goal_revenue != null ? Number(res.data.daily_goal_revenue) : nextDaily
    const w = res.data?.weekly_goal_revenue != null ? Number(res.data.weekly_goal_revenue) : nextWeekly
    setSavedDaily(d)
    setSavedWeekly(w)
    setJustSaved(true)
  }

  const hasSaved = savedDaily != null || savedWeekly != null

  return (
    <ConnectCard
      title="Metas"
      summary={
        hasSaved
          ? `Dia ${moneyBrl(savedDaily)} · Semana ${moneyBrl(savedWeekly)}`
          : 'Só as suas — não a meta do salão'
      }
      badge={hasSaved ? 'salva' : undefined}
    >
      {hasSaved && (
        <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-[0.65rem] uppercase tracking-wide text-gold-strong">Meta salva agora</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Dia {moneyBrl(savedDaily)} · Semana {moneyBrl(savedWeekly)}
          </p>
        </div>
      )}

      {!hasSaved && (
        <p className="mb-4 text-sm text-muted">Nenhuma meta salva ainda — preencha e salve abaixo.</p>
      )}

      <form onSubmit={save} className="flex flex-col gap-3">
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
    </ConnectCard>
  )
}

function TelegramBlock() {
  const [linked, setLinked] = useState(false)
  const [instructions, setInstructions] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiJson<{ linked?: boolean }>('/api/me/telegram').then((res) => {
      if (res.status === 401) return
      if (res.ok) setLinked(Boolean(res.data?.linked))
    })
  }, [])

  async function generate() {
    setError(null)
    const res = await apiJson<{ code: string; instructions: string }>('/api/me/telegram', {
      method: 'POST',
    })
    if (res.status === 401) return
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Erro')
      return
    }
    setCode(res.data.code)
    setInstructions(res.data.instructions)
  }

  async function unlink() {
    const res = await apiJson('/api/me/telegram', { method: 'DELETE' })
    if (res.status === 401) return
    setLinked(false)
    setCode(null)
    setInstructions(null)
  }

  return (
    <ConnectCard
      title="Telegram"
      summary={
        linked
          ? 'Assistente vinculada no Telegram'
          : 'Canal incluso no Standard — briefing e perguntas no Telegram'
      }
      badge={linked ? 'vinculado' : undefined}
    >
      {linked ? (
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
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
    </ConnectCard>
  )
}
