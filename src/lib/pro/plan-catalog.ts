import type { SubscriberPlan } from '@/lib/pro/subscribers'

/** ID público do plano (landing / checkout). */
export type ProPublicPlanId = 'standard' | 'pro'

export interface ProPlanOffer {
  /** ID na UI e no Stripe metadata. */
  id: ProPublicPlanId
  /** Valor persistido em `subscribers.plan` (standard = free no banco). */
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
    dbPlan: 'free',
    label: 'Standard',
    amountCents: 2990,
    priceLabel: 'R$ 29,90/mês',
    summary: 'App + Telegram + assistente com cota diária.',
    highlights: [
      'Hoje, Clientes e Ações',
      'Assistente no app e Telegram',
      '40 unidades de IA / dia',
      'Sem WhatsApp Cloud',
    ],
  },
  pro: {
    id: 'pro',
    dbPlan: 'pro',
    label: 'Pro',
    amountCents: 19990,
    priceLabel: 'R$ 199,90/mês',
    summary: 'Tudo do Standard + WhatsApp Cloud e mais IA.',
    highlights: [
      'Tudo do Standard',
      'WhatsApp Cloud (API Meta)',
      '150 unidades de IA / dia',
      'Packs de marketing avulsos',
    ],
  },
}

export function listProPlanOffers(): ProPlanOffer[] {
  return [PRO_PLAN_OFFERS.standard, PRO_PLAN_OFFERS.pro]
}

export function getProPlanOffer(id: string | null | undefined): ProPlanOffer | null {
  if (id === 'standard' || id === 'pro') return PRO_PLAN_OFFERS[id]
  if (id === 'free') return PRO_PLAN_OFFERS.standard
  return null
}

export function publicPlanFromDb(plan: SubscriberPlan): ProPublicPlanId {
  return plan === 'pro' ? 'pro' : 'standard'
}

export function labelForDbPlan(plan: SubscriberPlan): string {
  return plan === 'pro' ? PRO_PLAN_OFFERS.pro.label : PRO_PLAN_OFFERS.standard.label
}

/** Price ID Stripe do plano (env). */
export function stripePriceIdForPlan(id: ProPublicPlanId): string | null {
  if (id === 'pro') return process.env.STRIPE_PRICE_PRO?.trim() || null
  return process.env.STRIPE_PRICE_STANDARD?.trim() || null
}

export function formatBrlFromCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
