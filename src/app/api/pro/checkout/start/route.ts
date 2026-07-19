import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getProPlanOffer, type ProPublicPlanId } from '@/lib/pro/plan-catalog'
import { checkProRateLimit } from '@/lib/pro/rate-limit'
import { createSignupCheckout, isStripeConfigured } from '@/lib/pro/stripe'
import { captureHairsalesException } from '@/lib/pro/observability'

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkProRateLimit(req, {
      route: 'pro-checkout-start',
      limit: 10,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) {
      const res = err('Muitas tentativas de checkout. Aguarde um minuto e tente novamente.', 429)
      res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds))
      return res
    }

    if (!isStripeConfigured()) {
      return err('Pagamento indisponível neste ambiente (Stripe não configurado)', 503)
    }

    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const planRaw = typeof body?.plan === 'string' ? body.plan : ''
    const planId = planRaw as ProPublicPlanId

    if (!getProPlanOffer(planId)) {
      return err('Plano inválido. Use standard ou pro.', 400)
    }
    if (!email.includes('@')) return err('E-mail inválido', 400)

    const checkout = await createSignupCheckout({ email, publicPlan: planId })
    console.info(
      JSON.stringify({
        event: 'hairsales.checkout_started',
        surface: 'hairsales',
        plan: planId,
      }),
    )
    return ok({
      checkout_url: checkout.url,
      session_id: checkout.session_id,
      plan: planId,
    })
  } catch (e) {
    if (e instanceof Error) {
      const soft =
        /e-mail|Plano|STRIPE_PRICE|já existe|inválido/i.test(e.message)
      if (soft) return err(e.message, 400)
    }
    captureHairsalesException(e, null, {
      route: '/api/pro/checkout/start',
      method: 'POST',
    })
    return handleError(e)
  }
}
