import type { SubscriberPlan } from '@/lib/pro/subscribers'

/** ID público do plano (landing / checkout). */
export type ProPublicPlanId = 'standard' | 'pro'

export interface ProPlanOffer {
  /** ID na UI e no Stripe metadata. */
  id: ProPublicPlanId
  /** Valor persistido em `subscribers.plan`. */
  dbPlan: SubscriberPlan
  label: string
  /** Preço mensal em centavos BRL. */
  amountCents: number
  priceLabel: string
  summary: string
  highlights: string[]
}

/**
 * Planos do app do profissional (HairSales).
 * Painel da equipe (/login) não usa estes planos.
 */
export const PRO_PLAN_OFFERS: Record<ProPublicPlanId, ProPlanOffer> = {
  standard: {
    id: 'standard',
    dbPlan: 'standard',
    label: 'Standard',
    amountCents: 2990,
    priceLabel: 'R$ 29,90/mês',
    summary: 'App + Telegram + assistente com uso diário de IA.',
    highlights: [
      'Hoje, Clientes e Ações',
      'Assistente no app e Telegram',
      '40 unidades de IA / dia',
      'Sem WhatsApp',
    ],
  },
  pro: {
    id: 'pro',
    dbPlan: 'pro',
    label: 'Pro',
    amountCents: 19990,
    priceLabel: 'R$ 199,90/mês',
    summary: 'Tudo do Standard + WhatsApp e mais IA.',
    highlights: [
      'Tudo do Standard',
      'WhatsApp oficial da Meta',
      '150 unidades de IA / dia',
      'Créditos extras de mensagens',
    ],
  },
}

export function listProPlanOffers(): ProPlanOffer[] {
  return [PRO_PLAN_OFFERS.standard, PRO_PLAN_OFFERS.pro]
}

export function getProPlanOffer(id: string | null | undefined): ProPlanOffer | null {
  if (id === 'standard' || id === 'pro') return PRO_PLAN_OFFERS[id]
  return null
}

export function publicPlanFromDb(plan: SubscriberPlan): ProPublicPlanId {
  switch (plan) {
    case 'standard':
      return 'standard'
    case 'pro':
      return 'pro'
    default: {
      const exhaustive: never = plan
      throw new Error(`Plano inválido: ${exhaustive}`)
    }
  }
}

export function labelForDbPlan(plan: SubscriberPlan): string {
  switch (plan) {
    case 'standard':
      return PRO_PLAN_OFFERS.standard.label
    case 'pro':
      return PRO_PLAN_OFFERS.pro.label
    default: {
      const exhaustive: never = plan
      throw new Error(`Plano inválido: ${exhaustive}`)
    }
  }
}

/** Price ID Stripe do plano (env). */
export function stripePriceIdForPlan(id: ProPublicPlanId): string | null {
  switch (id) {
    case 'standard':
      return process.env.STRIPE_PRICE_STANDARD?.trim() || null
    case 'pro':
      return process.env.STRIPE_PRICE_PRO?.trim() || null
    default: {
      const exhaustive: never = id
      throw new Error(`Plano público inválido: ${exhaustive}`)
    }
  }
}

export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
