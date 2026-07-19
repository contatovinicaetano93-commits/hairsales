import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { ok, err, handleError } from '@/lib/api-response'
import { isCronAuthorized } from '@/lib/cron-auth'
import { getSql } from '@/lib/db'
import { isProduction } from '@/lib/env'
import {
  getStripe,
  isStripeConfigured,
  subscriptionStatusFromStripe,
} from '@/lib/pro/stripe'
import { stripePriceIdForPlan } from '@/lib/pro/plan-catalog'
import type { SubscriberPlan, SubscriptionStatus } from '@/lib/pro/subscribers'

export const runtime = 'nodejs'
export const maxDuration = 120

interface ReconcileSubscriberRow {
  id: string
  plan: SubscriberPlan
  subscription_status: SubscriptionStatus
  stripe_customer_id: string
}

interface ReconcileResult {
  checked: number
  updated: number
  unchanged: number
  errors: { subscriber_id: string; message: string }[]
}

function authorized(req: NextRequest) {
  if (isCronAuthorized(req)) return true
  if (!process.env.CRON_SECRET?.trim() && !isProduction()) return true
  return false
}

function boundedLimit(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('limit') || 50)
  if (!Number.isFinite(raw) || raw <= 0) return 50
  return Math.min(Math.floor(raw), 50)
}

function chooseSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  return (
    subscriptions.find((subscription) =>
      ['active', 'trialing', 'past_due'].includes(subscription.status),
    ) ??
    subscriptions[0] ??
    null
  )
}

function planFromSubscription(subscription: Stripe.Subscription): SubscriberPlan | null {
  const priceIds = new Set(subscription.items.data.map((item) => item.price.id))
  const proPrice = stripePriceIdForPlan('pro')
  if (proPrice && priceIds.has(proPrice)) return 'pro'

  const standardPrice = stripePriceIdForPlan('standard')
  if (standardPrice && priceIds.has(standardPrice)) return 'standard'

  return null
}

async function loadSubscribers(limit: number): Promise<ReconcileSubscriberRow[]> {
  const sql = getSql()
  return (await sql`
    select id, plan, subscription_status, stripe_customer_id
    from subscribers
    where stripe_customer_id is not null
    order by updated_at asc
    limit ${limit}
  `) as ReconcileSubscriberRow[]
}

async function updateSubscriberBillingState(
  subscriber: ReconcileSubscriberRow,
  status: SubscriptionStatus,
  plan: SubscriberPlan | null,
): Promise<boolean> {
  const sql = getSql()
  if (subscriber.subscription_status === status && (!plan || subscriber.plan === plan)) {
    return false
  }

  if (plan) {
    await sql`
      update subscribers
      set subscription_status = ${status},
          plan = ${plan},
          updated_at = now()
      where id = ${subscriber.id}
    `
    return true
  }

  await sql`
    update subscribers
    set subscription_status = ${status},
        updated_at = now()
    where id = ${subscriber.id}
  `
  return true
}

async function reconcileStripeBilling(limit: number): Promise<ReconcileResult> {
  const stripe = getStripe()
  const subscribers = await loadSubscribers(limit)
  const result: ReconcileResult = {
    checked: 0,
    updated: 0,
    unchanged: 0,
    errors: [],
  }

  for (const subscriber of subscribers) {
    result.checked += 1
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: subscriber.stripe_customer_id,
        status: 'all',
        limit: 10,
      })
      const subscription = chooseSubscription(subscriptions.data)
      const status = subscription ? subscriptionStatusFromStripe(subscription.status) : 'none'
      const plan = subscription ? planFromSubscription(subscription) : null
      const updated = await updateSubscriberBillingState(subscriber, status, plan)
      if (updated) result.updated += 1
      else result.unchanged += 1
    } catch (e) {
      result.errors.push({
        subscriber_id: subscriber.id,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return result
}

export async function GET(req: NextRequest) {
  try {
    if (!authorized(req)) return err('Não autorizado', 401)
    if (!isStripeConfigured()) return err('Stripe não configurado', 503)
    return ok(await reconcileStripeBilling(boundedLimit(req)))
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
