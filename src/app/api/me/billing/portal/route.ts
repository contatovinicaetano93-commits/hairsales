import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { assertCan } from '@/lib/pro/entitlements'
import { createBillingPortalSession, isStripeConfigured } from '@/lib/pro/stripe'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    assertCan(auth.session.subscriber, 'billing_portal')
    if (!isStripeConfigured()) return err('Stripe não configurado', 503)

    const { url } = await createBillingPortalSession(auth.session.subscriber)
    return ok({ url })
  } catch (e) {
    return handleError(e)
  }
}
