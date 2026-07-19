import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { ok, err } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import {
  fulfillProSubscription,
  fulfillStripePackSession,
  getStripe,
  isStripeConfigured,
  markSignupCheckoutPaid,
  subscriptionStatusFromStripe,
} from '@/lib/pro/stripe'
import { captureHairsalesException } from '@/lib/pro/observability'

export const runtime = 'nodejs'

type StripeObjectWithSubscriber = {
  client_reference_id?: string | null
  metadata?: {
    kind?: string
    subscriber_id?: string
  } | null
}

function stripeSubscriberContext(event: Stripe.Event) {
  const object = event.data.object as StripeObjectWithSubscriber
  const subscriberId = object.metadata?.subscriber_id ?? object.client_reference_id ?? null

  return {
    subscriber: subscriberId ? { id: subscriberId } : null,
    extra: {
      route: '/api/webhooks/stripe',
      event_type: event.type,
      stripe_event_id: event.id,
      metadata_kind: object.metadata?.kind ?? null,
    },
  }
}

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
        if (session.metadata?.kind === 'pro_signup') {
          await markSignupCheckoutPaid(session)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const subscriberId = sub.metadata?.subscriber_id
        if (subscriberId && sub.metadata?.kind === 'pro_subscription') {
          const sql = getSql()
          await sql`
            update subscribers
            set plan = 'standard',
                subscription_status = 'canceled',
                updated_at = now()
            where id = ${subscriberId}
          `
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const subscriberId = sub.metadata?.subscriber_id
        if (subscriberId && sub.metadata?.kind === 'pro_subscription') {
          const status = subscriptionStatusFromStripe(sub.status)
          const sql = getSql()
          await sql`
            update subscribers
            set subscription_status = ${status},
                updated_at = now()
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
    const context = stripeSubscriberContext(event)
    captureHairsalesException(e, context.subscriber, context.extra)
    console.error('[stripe webhook]', e)
    return err(e instanceof Error ? e.message : 'Erro no webhook', 500)
  }
}
