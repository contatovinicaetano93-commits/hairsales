import { getActiveConnection, type SubscriberRow } from '@/lib/pro/subscribers'
import { getSubscriberWhatsapp, getWhatsappUsage } from '@/lib/pro/whatsapp-cloud'
import { getQuotaStatus } from '@/lib/pro/quotas'
import { getEmbeddedSignupConfig } from '@/lib/pro/whatsapp-embedded'
import { isStripeConfigured } from '@/lib/pro/stripe'

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
}

export async function buildOnboardingStatus(subscriber: SubscriberRow): Promise<OnboardingStatus> {
  const [conn, wa, quotas, usage] = await Promise.all([
    getActiveConnection(subscriber.id),
    getSubscriberWhatsapp(subscriber.id),
    getQuotaStatus(subscriber.id, subscriber.plan),
    getWhatsappUsage(subscriber.id, subscriber.plan),
  ])

  const embedded = getEmbeddedSignupConfig()
  const hasGoals =
    subscriber.daily_goal_revenue != null || subscriber.weekly_goal_revenue != null

  const steps: OnboardingStep[] = [
    {
      id: 'account',
      title: 'Conta criada',
      done: true,
      required: true,
      href: '/pro/conectar',
      detail: subscriber.email,
    },
    {
      id: 'agenda',
      title: 'Conectar agenda (Avec/Trinks)',
      done: conn?.status === 'active',
      required: true,
      href: '/pro/conectar',
      detail:
        conn?.status === 'active'
          ? `${conn.provider} · ${conn.professional_name_matched}`
          : 'Obrigatório para ver seus dados',
    },
    {
      id: 'goals',
      title: 'Definir meta',
      done: hasGoals,
      required: false,
      href: '/pro/conectar',
      detail: hasGoals
        ? `Dia R$ ${subscriber.daily_goal_revenue ?? '—'} · Semana R$ ${subscriber.weekly_goal_revenue ?? '—'}`
        : 'Opcional — acompanha progresso no Hoje',
    },
    {
      id: 'telegram',
      title: 'Vincular Telegram',
      done: Boolean(subscriber.telegram_chat_id),
      required: false,
      href: '/pro/conectar',
      detail: subscriber.telegram_chat_id
        ? 'Assistente no Telegram ativo'
        : 'Canal grátis da assistente',
    },
    {
      id: 'plan_pro',
      title: 'Plano Pro',
      done: subscriber.plan === 'pro',
      required: false,
      href: '/pro/conectar',
      detail:
        subscriber.plan === 'pro'
          ? 'WhatsApp Cloud e packs liberados'
          : 'Necessário para WhatsApp Cloud',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Cloud',
      done: Boolean(wa && wa.status === 'active'),
      required: false,
      href: '/pro/conectar',
      detail:
        wa?.status === 'active'
          ? `Utility ${usage.utility_sent}/${usage.utility_included} · mkt ${usage.marketing_remaining}`
          : subscriber.plan === 'pro'
            ? embedded.enabled
              ? 'Conectar com Meta ou token manual'
              : 'Cole phone_number_id + token'
            : 'Disponível no Pro',
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
    plan: subscriber.plan,
    stripe_enabled: isStripeConfigured(),
    embedded_signup_enabled: embedded.enabled,
    ai_daily_remaining: quotas.daily_remaining,
    has_stripe_customer: Boolean(subscriber.stripe_customer_id),
  }
}
