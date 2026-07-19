import { ok } from '@/lib/api-response'
import { listProPlanOffers, stripePriceIdForPlan } from '@/lib/pro/plan-catalog'
import { isStripeConfigured } from '@/lib/pro/stripe'

/** Catálogo público de planos HairSales (painel do profissional). */
export async function GET() {
  const plans = listProPlanOffers().map((p) => ({
    id: p.id,
    label: p.label,
    amount_cents: p.amountCents,
    price_label: p.priceLabel,
    summary: p.summary,
    highlights: p.highlights,
    stripe_price_configured: Boolean(stripePriceIdForPlan(p.id)),
  }))

  return ok({
    stripe_enabled: isStripeConfigured(),
    plans,
    note: 'Painel da equipe (/login) não usa estes planos.',
  })
}
