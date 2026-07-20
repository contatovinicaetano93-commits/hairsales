import { getActiveConnection, type SubscriberRow } from '@/lib/pro/subscribers'
import { getSubscriberWhatsapp, getWhatsappUsage } from '@/lib/pro/whatsapp-cloud'
import { getQuotaStatus } from '@/lib/pro/quotas'
import { getEmbeddedSignupConfig } from '@/lib/pro/whatsapp-embedded'
import { isStripeConfigured } from '@/lib/pro/stripe'
import { askAI } from '@/lib/ai/client'

const ONBOARDING_TIP_SYSTEM_PROMPT = `Você orienta profissionais de beleza autônomos no setup do HairSales (app "Pro").
Dado o(s) passo(s) pendente(s) mais importante(s), escreva UMA frase curta (máx. 140 caracteres), encorajadora e prática, em português, dizendo o próximo passo e o motivo. Sem saudação, sem emoji, sem markdown.`

function proOnboardingFallbackTip(): string {
  return 'Conecte sua agenda pra começar.'
}

/** Dá um teto de tempo para a chamada de IA não travar o payload de onboarding. */
function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(onTimeout())
      },
    )
  })
}

/** Gera uma dica curta de IA para o próximo passo do onboarding. Nunca lança — sempre cai no fallback estático. */
export async function buildOnboardingAiTip(steps: OnboardingStep[]): Promise<string | null> {
  const pendingRequired = steps.filter((s) => s.required && !s.done)
  if (pendingRequired.length === 0) return null

  const context = pendingRequired.map((s) => `${s.title}: ${s.detail}`).join('\n')

  return withTimeout(
    askAI(ONBOARDING_TIP_SYSTEM_PROMPT, context, proOnboardingFallbackTip),
    2500,
    proOnboardingFallbackTip,
  )
}

export type OnboardingStepId =
  | 'account'
  | 'agenda'
  | 'goals'
  | 'telegram'
  | 'plan_pro'
  | 'whatsapp'

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  done: boolean
  required: boolean
  href: string
  detail: string
}

export interface OnboardingStatus {
  completed: number
  total_required: number
  percent: number
  ready_for_day: boolean
  steps: OnboardingStep[]
  plan: string
  stripe_enabled: boolean
  embedded_signup_enabled: boolean
  ai_daily_remaining: number
  has_stripe_customer: boolean
  ai_tip: string | null
}

export interface OnboardingComputeInput {
  email: string
  plan: string
  daily_goal_revenue: number | null
  weekly_goal_revenue: number | null
  telegram_chat_id?: string | null
  stripe_customer_id?: string | null
  connection: {
    status: string
    provider: string
    professional_name_matched: string | null
  } | null
  whatsapp_active: boolean
  utility_sent: number
  utility_included: number
  marketing_remaining: number
  embedded_enabled: boolean
  stripe_enabled: boolean
  ai_daily_remaining: number
  ai_tip?: string | null
}

/** Pure — usado por testes e por `buildOnboardingStatus`. */
export function computeOnboardingStatus(input: OnboardingComputeInput): OnboardingStatus {
  const hasGoals = input.daily_goal_revenue != null || input.weekly_goal_revenue != null
  const agendaActive = input.connection?.status === 'active'

  const steps: OnboardingStep[] = [
    {
      id: 'account',
      title: 'Conta criada',
      done: true,
      required: true,
      href: '/pro/conectar',
      detail: input.email,
    },
    {
      id: 'agenda',
      title: 'Conectar agenda (Avec/Trinks)',
      done: agendaActive,
      required: true,
      href: '/pro/conectar',
      detail: agendaActive
        ? `${input.connection!.provider} · ${input.connection!.professional_name_matched}`
        : 'Obrigatório para ver seus dados',
    },
    {
      id: 'goals',
      title: 'Definir meta',
      done: hasGoals,
      required: false,
      href: '/pro/conectar',
      detail: hasGoals
        ? `Dia R$ ${input.daily_goal_revenue ?? '—'} · Semana R$ ${input.weekly_goal_revenue ?? '—'}`
        : 'Opcional — acompanha progresso no Hoje',
    },
    {
      id: 'telegram',
      title: 'Vincular Telegram',
      done: Boolean(input.telegram_chat_id),
      required: false,
      href: '/pro/conectar',
      detail: input.telegram_chat_id
        ? 'Assistente no Telegram ativo'
        : 'Canal incluso no Standard',
    },
    {
      id: 'plan_pro',
      title: 'Plano Pro',
      done: input.plan === 'pro',
      required: false,
      href: '/pro/conectar',
      detail:
        input.plan === 'pro'
          ? 'Pro R$ 199,90 — WhatsApp Cloud liberado'
          : 'Standard R$ 29,90 — upgrade para WhatsApp Cloud',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Cloud',
      done: input.whatsapp_active,
      required: false,
      href: '/pro/conectar',
      detail: input.whatsapp_active
        ? `Utility ${input.utility_sent}/${input.utility_included} · mkt ${input.marketing_remaining}`
        : input.plan === 'pro'
          ? input.embedded_enabled
            ? 'Conectar com Meta ou token manual'
            : 'Cole phone_number_id + token'
          : 'Incluso no Pro (R$ 199,90)',
    },
  ]

  const required = steps.filter((s) => s.required)
  const completedRequired = required.filter((s) => s.done).length
  const completed = steps.filter((s) => s.done).length

  return {
    completed,
    total_required: required.length,
    percent: Math.round((completed / steps.length) * 100),
    ready_for_day: completedRequired === required.length,
    steps,
    plan: input.plan,
    stripe_enabled: input.stripe_enabled,
    embedded_signup_enabled: input.embedded_enabled,
    ai_daily_remaining: input.ai_daily_remaining,
    has_stripe_customer: Boolean(input.stripe_customer_id),
    ai_tip: input.ai_tip ?? null,
  }
}

export async function buildOnboardingStatus(subscriber: SubscriberRow): Promise<OnboardingStatus> {
  const [conn, wa, quotas, usage] = await Promise.all([
    getActiveConnection(subscriber.id),
    getSubscriberWhatsapp(subscriber.id),
    getQuotaStatus(subscriber.id, subscriber.plan),
    getWhatsappUsage(subscriber.id, subscriber.plan),
  ])

  const embedded = getEmbeddedSignupConfig()

  const status = computeOnboardingStatus({
    email: subscriber.email,
    plan: subscriber.plan,
    daily_goal_revenue: subscriber.daily_goal_revenue,
    weekly_goal_revenue: subscriber.weekly_goal_revenue,
    telegram_chat_id: subscriber.telegram_chat_id,
    stripe_customer_id: subscriber.stripe_customer_id,
    connection: conn
      ? {
          status: conn.status,
          provider: conn.provider,
          professional_name_matched: conn.professional_name_matched,
        }
      : null,
    whatsapp_active: Boolean(wa && wa.status === 'active'),
    utility_sent: usage.utility_sent,
    utility_included: usage.utility_included,
    marketing_remaining: usage.marketing_remaining,
    embedded_enabled: embedded.enabled,
    stripe_enabled: isStripeConfigured(),
    ai_daily_remaining: quotas.daily_remaining,
  })

  if (!status.ready_for_day) {
    status.ai_tip = await buildOnboardingAiTip(status.steps)
  }

  return status
}
