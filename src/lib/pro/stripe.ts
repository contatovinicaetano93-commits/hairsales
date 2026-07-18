import Stripe from 'stripe'
import { getSql } from '@/lib/db'
import type { SubscriberRow } from '@/lib/pro/subscribers'
import { getMarketingPack, type MarketingPack } from '@/lib/pro/pack-catalog'

let stripeClient: Stripe | null = null

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2025-08-27.basil' })
  }
  return stripeClient
}

function appBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim()
  if (!url) return 'http://localhost:3000'
  return url.startsWith('http') ? url.replace(/\/$/, '') : `https://${url.replace(/\/$/, '')}`
}

async function ensureStripeCustomer(subscriber: SubscriberRow): Promise<string> {
  const sql = getSql()
  if (subscriber.stripe_customer_id) return subscriber.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: subscriber.email,
    name: subscriber.display_name,
    metadata: { subscriber_id: subscriber.id },
  })

  await sql`
    update subscribers
    set stripe_customer_id = ${customer.id}, updated_at = now()
    where id = ${subscriber.id}
  `
  return customer.id
}

export async function createMarketingPackCheckout(
  subscriber: SubscriberRow,
  packId: string,
): Promise<{ url: string; session_id: string; pack: MarketingPack }> {
  if (subscriber.plan !== 'pro') {
    throw new Error('Packs de marketing estão no plano Pro.')
  }
  const pack = getMarketingPack(packId)
  if (!pack) throw new Error('Pack inválido')

  const stripe = getStripe()
  const customerId = await ensureStripeCustomer(subscriber)
  const base = appBaseUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: subscriber.id,
    success_url: `${base}/pro/conectar?pack=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pro/conectar?pack=cancel`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: pack.amount_cents,
          product_data: {
            name: `Pack marketing WhatsApp — ${pack.label}`,
            description: `${pack.credits} créditos de mensagens marketing`,
          },
        },
      },
    ],
    metadata: {
      subscriber_id: subscriber.id,
      pack_id: pack.id,
      credits: String(pack.credits),
      kind: 'marketing_pack',
    },
  })

  if (!session.url) throw new Error('Stripe não retornou URL de checkout')

  const sql = getSql()
  await sql`
    insert into subscriber_whatsapp_pack_purchases (
      subscriber_id, pack_id, credits, amount_cents, status, stripe_session_id, provider
    ) values (
      ${subscriber.id},
      ${pack.id},
      ${pack.credits},
      ${pack.amount_cents},
      'pending',
      ${session.id},
      'stripe'
    )
  `

  return { url: session.url, session_id: session.id, pack }
}

/** Credita pack após pagamento confirmado (idempotente por session). */
export async function fulfillStripePackSession(session: Stripe.Checkout.Session): Promise<{
  credited: boolean
  subscriber_id?: string
  credits?: number
}> {
  if (session.metadata?.kind !== 'marketing_pack') {
    return { credited: false }
  }

  const sessionId = session.id
  const subscriberId = session.metadata.subscriber_id || session.client_reference_id
  const packId = session.metadata.pack_id
  const credits = Number(session.metadata.credits || 0)

  if (!subscriberId || !packId || !Number.isFinite(credits) || credits <= 0) {
    throw new Error('Metadata Stripe incompleta para pack')
  }

  const sql = getSql()
  const existing = (await sql`
    select id, status from subscriber_whatsapp_pack_purchases
    where stripe_session_id = ${sessionId}
    limit 1
  `) as { id: string; status: string }[]

  if (existing[0]?.status === 'completed') {
    return { credited: false, subscriber_id: subscriberId, credits }
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  if (existing[0]) {
    await sql`
      update subscriber_whatsapp_pack_purchases
      set status = 'completed',
          stripe_payment_intent = ${paymentIntent},
          credits = ${credits}
      where id = ${existing[0].id}
    `
  } else {
    await sql`
      insert into subscriber_whatsapp_pack_purchases (
        subscriber_id, pack_id, credits, amount_cents, status,
        stripe_session_id, stripe_payment_intent, provider
      ) values (
        ${subscriberId},
        ${packId},
        ${credits},
        ${session.amount_total ?? null},
        'completed',
        ${sessionId},
        ${paymentIntent},
        'stripe'
      )
    `
  }

  await sql`
    update subscribers
    set marketing_credits = coalesce(marketing_credits, 0) + ${credits},
        updated_at = now()
    where id = ${subscriberId}
  `

  return { credited: true, subscriber_id: subscriberId, credits }
}

export async function createProSubscriptionCheckout(
  subscriber: SubscriberRow,
): Promise<{ url: string; session_id: string } | null> {
  const priceId = process.env.STRIPE_PRICE_PRO?.trim()
  if (!priceId || !isStripeConfigured()) return null
  if (subscriber.plan === 'pro') {
    throw new Error('Você já está no plano Pro')
  }

  const stripe = getStripe()
  const customerId = await ensureStripeCustomer(subscriber)
  const base = appBaseUrl()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: subscriber.id,
    success_url: `${base}/pro/conectar?plan=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pro/conectar?plan=cancel`,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      subscriber_id: subscriber.id,
      kind: 'pro_subscription',
    },
    subscription_data: {
      metadata: {
        subscriber_id: subscriber.id,
        kind: 'pro_subscription',
      },
    },
  })

  if (!session.url) throw new Error('Stripe não retornou URL de checkout')
  return { url: session.url, session_id: session.id }
}

export async function fulfillProSubscription(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== 'pro_subscription' && session.mode !== 'subscription') {
    return { upgraded: false }
  }
  const subscriberId = session.metadata?.subscriber_id || session.client_reference_id
  if (!subscriberId) return { upgraded: false }

  const sql = getSql()
  await sql`
    update subscribers set plan = 'pro', updated_at = now()
    where id = ${subscriberId}
  `
  return { upgraded: true, subscriber_id: subscriberId }
}

/** Features padrão do Customer Portal (Assistente Vitrini / Pro). */
export function defaultBillingPortalFeatures(): Stripe.BillingPortal.ConfigurationCreateParams.Features {
  return {
    customer_update: {
      enabled: true,
      allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id'],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: ['too_expensive', 'missing_features', 'unused', 'switched_service', 'other'],
      },
    },
    subscription_update: { enabled: false },
  }
}

/**
 * Garante uma configuração de Customer Portal com return URL e features Pro.
 * Preferência: STRIPE_PORTAL_CONFIGURATION_ID → default da conta → cria nova.
 */
export async function ensureDefaultBillingPortalConfiguration(): Promise<{
  id: string
  created: boolean
  default_return_url: string | null
}> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe não configurado')
  }

  const stripe = getStripe()
  const returnUrl = `${appBaseUrl()}/pro/conectar`
  const features = defaultBillingPortalFeatures()
  const business_profile = {
    headline: 'Assistente Vitrini — gerencie sua assinatura Pro',
  }

  const configuredId = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim()
  if (configuredId) {
    const updated = await stripe.billingPortal.configurations.update(configuredId, {
      default_return_url: returnUrl,
      business_profile,
      features,
    })
    return {
      id: updated.id,
      created: false,
      default_return_url: updated.default_return_url,
    }
  }

  const listed = await stripe.billingPortal.configurations.list({ limit: 20 })
  const existing = listed.data.find((c) => c.is_default) ?? listed.data[0]
  if (existing) {
    const updated = await stripe.billingPortal.configurations.update(existing.id, {
      default_return_url: returnUrl,
      business_profile,
      features,
    })
    return {
      id: updated.id,
      created: false,
      default_return_url: updated.default_return_url,
    }
  }

  const created = await stripe.billingPortal.configurations.create({
    default_return_url: returnUrl,
    business_profile,
    features,
  })
  return {
    id: created.id,
    created: true,
    default_return_url: created.default_return_url,
  }
}

/** Customer Portal — faturas, cartão, cancelar assinatura. */
export async function createBillingPortalSession(
  subscriber: SubscriberRow,
): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe não configurado')
  }
  if (!subscriber.stripe_customer_id) {
    throw new Error('Nenhuma conta de cobrança Stripe ainda. Assine o Pro ou compre um pack primeiro.')
  }

  const stripe = getStripe()
  const base = appBaseUrl()
  const configuration =
    process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined

  const portal = await stripe.billingPortal.sessions.create({
    customer: subscriber.stripe_customer_id,
    return_url: `${base}/pro/conectar`,
    ...(configuration ? { configuration } : {}),
  })
  if (!portal.url) throw new Error('Stripe Portal sem URL')
  return { url: portal.url }
}
