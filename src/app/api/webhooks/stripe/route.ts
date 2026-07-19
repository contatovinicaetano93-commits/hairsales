import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { ok, err } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import {
  claimBillingEvent,
  deleteBillingEvent,
  markBillingEvent,
  type BillingEventPayloadSummary,
  type BillingEventStatus,
} from '@/lib/pro/billing-events'
import {
  fulfillProSubscription,
  fulfillStripePackSession,
  getStripe,
  isStripeConfigured,
  markSignupCheckoutPaid,
  subscriptionStatusFromStripe,
} from '@/lib/pro/stripe'

export const runtime = 'nodejs'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function stripeRefId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

function normalizeSubscriberId(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed || !uuidPattern.test(trimmed)) return null
  return trimmed
}

function subscriberIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object
  if ('metadata' in object) {
    return normalizeSubscriberId(object.metadata?.subscriber_id)
  }
  return null
}

function summarizeStripeEvent(event: Stripe.Event): BillingEventPayloadSummary {
  const object = event.data.object

  if (event.type === 'checkout.session.completed') {
    const session = object as Stripe.Checkout.Session
    return {
      object: 'checkout.session',
      session_id: session.id,
      kind: session.metadata?.kind ?? null,
      mode: session.mode,
      payment_status: session.payment_status,
      customer: stripeRefId(session.customer),
      subscription: stripeRefId(session.subscription),
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = object as Stripe.Subscription
    return {
      object: 'subscription',
      subscription_id: subscription.id,
      kind: subscription.metadata?.kind ?? null,
      status: subscription.status,
      customer: stripeRefId(subscription.customer),
    }
  }

  return { object: object.object, id: 'id' in object ? object.id : null }
}

async function handleStripeEvent(event: Stripe.Event): Promise<BillingEventStatus> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.kind === 'marketing_pack') {
        await fulfillStripePackSession(session)
        return 'processed'
      }
      if (session.metadata?.kind === 'pro_subscription') {
        await fulfillProSubscription(session)
        return 'processed'
      }
      if (session.metadata?.kind === 'pro_signup') {
        await markSignupCheckoutPaid(session)
        return 'processed'
      }
      return 'ignored'
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const subscriberId = normalizeSubscriberId(sub.metadata?.subscriber_id)
      if (subscriberId && sub.metadata?.kind === 'pro_subscription') {
        const sql = getSql()
        await sql`
          update subscribers
          set plan = 'standard',
              subscription_status = 'canceled',
              updated_at = now()
          where id = ${subscriberId}
        `
        return 'processed'
      }
      return 'ignored'
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const subscriberId = normalizeSubscriberId(sub.metadata?.subscriber_id)
      if (subscriberId && sub.metadata?.kind === 'pro_subscription') {
        const status = subscriptionStatusFromStripe(sub.status)
        const sql = getSql()
        await sql`
          update subscribers
          set subscription_status = ${status},
              updated_at = now()
          where id = ${subscriberId}
        `
        return 'processed'
      }
      return 'ignored'
    }
    default:
      return 'ignored'
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

  const subscriberId = subscriberIdFromEvent(event)
  const payloadSummary = summarizeStripeEvent(event)
  const claim = await claimBillingEvent(event.id, event.type, subscriberId, {
    payloadSummary,
  })
  if (!claim.claimed) {
    return ok({ received: true, duplicate: true, type: event.type })
  }

  let status: BillingEventStatus
  try {
    status = await handleStripeEvent(event)
  } catch (e) {
    // The event row is a concurrency claim. Delete it on handler failure so Stripe's retry
    // can claim and run the handler again instead of being blocked by the unique event id.
    try {
      await deleteBillingEvent(event.id)
    } catch (deleteError) {
      console.error('[stripe webhook] failed to release event claim', deleteError)
    }
    console.error('[stripe webhook]', e)
    return err(e instanceof Error ? e.message : 'Erro no webhook', 500)
  }

  try {
    await markBillingEvent(event.id, { status, subscriberId, payloadSummary })
  } catch (e) {
    console.error('[stripe webhook] failed to update event ledger', e)
  }

  return ok({ received: true, type: event.type, status })
}
