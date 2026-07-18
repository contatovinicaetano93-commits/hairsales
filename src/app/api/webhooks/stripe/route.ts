import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { ok, err } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import {
  fulfillProSubscription,
  fulfillStripePackSession,
  getStripe,
  isStripeConfigured,
} from '@/lib/pro/stripe'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return err('Stripe não configurado', 503)

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) return err('STRIPE_WEBHOOK_SECRET não configurado', 503)

  const signature = req.headers.get('stripe-signature')
  if (!signature) return err('Assinatura ausente', 400)

  const rawBody = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[stripe webhook] signature', message)
    return err(`Webhook inválido: ${message}`, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.kind === 'marketing_pack') {
          await fulfillStripePackSession(session)
        }
        if (session.metadata?.kind === 'pro_subscription') {
          await fulfillProSubscription(session)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const subscriberId = sub.metadata?.subscriber_id
        if (subscriberId && sub.metadata?.kind === 'pro_subscription') {
          const sql = getSql()
          await sql`
            update subscribers set plan = 'free', updated_at = now()
            where id = ${subscriberId}
          `
        }
        break
      }
      default:
        break
    }
    return ok({ received: true, type: event.type })
  } catch (e) {
    console.error('[stripe webhook]', e)
    return err(e instanceof Error ? e.message : 'Erro no webhook', 500)
  }
}
