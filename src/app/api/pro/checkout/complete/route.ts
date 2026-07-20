import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import {
  PRO_AUTH_COOKIE,
  createProSessionToken,
  proSessionCookieOptions,
} from '@/lib/pro/auth'
import {
  completeSignupFromCheckout,
  getSignupCheckoutPreview,
  isStripeConfigured,
} from '@/lib/pro/stripe'
import { labelForDbPlan } from '@/lib/pro/plan-catalog'
import { captureHairsalesException } from '@/lib/pro/observability'
import { sendWelcomeEmail } from '@/lib/pro/email'
import type { SubscriberRow } from '@/lib/pro/subscribers'

export async function GET(req: NextRequest) {
  try {
    if (!isStripeConfigured()) return err('Stripe não configurado', 503)
    const sessionId = req.nextUrl.searchParams.get('session_id')?.trim()
    if (!sessionId) return err('session_id obrigatório', 400)
    const preview = await getSignupCheckoutPreview(sessionId)
    return ok(preview)
  } catch (e) {
    captureHairsalesException(e, null, {
      route: '/api/pro/checkout/complete',
      method: 'GET',
    })
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  let subscriber: SubscriberRow | null = null
  try {
    if (!isStripeConfigured()) return err('Stripe não configurado', 503)

    const body = await req.json().catch(() => null)
    const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : ''
    const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!sessionId) return err('session_id obrigatório', 400)
    if (displayName.length < 2) return err('Informe seu nome como no Avec/Trinks', 400)
    if (password.length < 6) return err('Senha precisa ter pelo menos 6 caracteres', 400)

    subscriber = await completeSignupFromCheckout({
      sessionId,
      displayName,
      password,
    })
    console.info(
      JSON.stringify({
        event: 'hairsales.signup_completed',
        surface: 'hairsales',
        subscriber_id: subscriber.id,
        plan: subscriber.plan,
        subscription_status: subscriber.subscription_status,
      }),
    )
    void sendWelcomeEmail(subscriber.email, subscriber.display_name)

    const res = ok({
      id: subscriber.id,
      display_name: subscriber.display_name,
      email: subscriber.email,
      plan: subscriber.plan,
      subscription_status: subscriber.subscription_status,
      plan_label: labelForDbPlan(subscriber.plan),
    })
    res.cookies.set(
      PRO_AUTH_COOKIE,
      createProSessionToken(subscriber.id, subscriber.session_version),
      proSessionCookieOptions(),
    )
    return res
  } catch (e) {
    captureHairsalesException(e, subscriber, {
      route: '/api/pro/checkout/complete',
      method: 'POST',
    })
    return handleError(e)
  }
}
