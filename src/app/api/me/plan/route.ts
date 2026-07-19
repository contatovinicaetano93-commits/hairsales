import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { requireProSession } from '@/lib/pro/auth'
import { findSubscriberById, type SubscriberPlan } from '@/lib/pro/subscribers'
import { labelForDbPlan, listProPlanOffers, stripePriceIdForPlan } from '@/lib/pro/plan-catalog'
import { createProSubscriptionCheckout, isStripeConfigured } from '@/lib/pro/stripe'

function allowSelfUpgrade() {
  return (
    process.env.PRO_ALLOW_SELF_UPGRADE === '1' ||
    process.env.PRO_ALLOW_SELF_UPGRADE === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    return ok({
      plan: auth.session.subscriber.plan,
      plan_label: labelForDbPlan(auth.session.subscriber.plan),
      self_upgrade_allowed: allowSelfUpgrade(),
      stripe_enabled: isStripeConfigured(),
      stripe_standard_price_configured: Boolean(stripePriceIdForPlan('standard')),
      stripe_pro_price_configured: Boolean(stripePriceIdForPlan('pro')),
      offers: listProPlanOffers().map((p) => ({
        id: p.id,
        label: p.label,
        amount_cents: p.amountCents,
        price_label: p.priceLabel,
      })),
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const body = await req.json().catch(() => null)
    const plan = body?.plan as SubscriberPlan
    const useStripe = body?.checkout === true || body?.provider === 'stripe'

    if (plan === 'pro' && useStripe && isStripeConfigured() && process.env.STRIPE_PRICE_PRO?.trim()) {
      const checkout = await createProSubscriptionCheckout(auth.session.subscriber)
      if (!checkout) return err('Preço Pro não configurado (STRIPE_PRICE_PRO)', 503)
      return ok({ mode: 'stripe', checkout_url: checkout.url, session_id: checkout.session_id })
    }

    if (!allowSelfUpgrade()) {
      return err(
        isStripeConfigured()
          ? 'Use checkout: true com Stripe, ou habilite PRO_ALLOW_SELF_UPGRADE'
          : 'Upgrade de plano indisponível neste ambiente',
        403,
      )
    }

    if (plan !== 'free' && plan !== 'pro') return err('plan deve ser free ou pro', 400)

    const sql = getSql()
    await sql`
      update subscribers set plan = ${plan}, updated_at = now()
      where id = ${auth.session.subscriber.id}
    `
    const updated = await findSubscriberById(auth.session.subscriber.id)
    return ok({ mode: 'demo', plan: updated?.plan ?? plan })
  } catch (e) {
    return handleError(e)
  }
}
