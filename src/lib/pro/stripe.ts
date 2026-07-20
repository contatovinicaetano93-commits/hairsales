import Stripe from 'stripe'
import { getSql } from '@/lib/db'
import {
  getProPlanOffer,
  stripePriceIdForPlan,
  type ProPublicPlanId,
} from '@/lib/pro/plan-catalog'
import {
  createSubscriber,
  findSubscriberByEmail,
  hasActiveSubscription,
  type SubscriberPlan,
  type SubscriberRow,
  type SubscriptionStatus,
} from '@/lib/pro/subscribers'
import { assertCan } from '@/lib/pro/entitlements'
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

export function subscriptionStatusFromStripe(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
    case 'paused':
      return 'none'
    default: {
      const exhaustive: never = status
      throw new Error(`Status Stripe inválido: ${exhaustive}`)
    }
  }
}

function stripeObjectId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

export function planFromStripeSubscription(
  subscription: Stripe.Subscription,
): SubscriberPlan | null {
  const priceIds = new Set(subscription.items.data.map((item) => item.price.id))
  const proPrice = stripePriceIdForPlan('pro')
  if (proPrice && priceIds.has(proPrice)) return 'pro'

  const standardPrice = stripePriceIdForPlan('standard')
  if (standardPrice && priceIds.has(standardPrice)) return 'standard'

  return null
}

export async function resolveSubscriberIdForFailedInvoice(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const subscriptionDetails = invoice.parent?.subscription_details
  const metadataSubscriberId = subscriptionDetails?.metadata?.subscriber_id?.trim()
  if (metadataSubscriberId) return metadataSubscriberId

  const subscriptionId = stripeObjectId(subscriptionDetails?.subscription)
  if (subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
    const subscriberId = subscription.metadata?.subscriber_id?.trim()
    if (subscriberId) return subscriberId
  }

  const customerId = stripeObjectId(invoice.customer)
  if (!customerId) return null

  const sql = getSql()
  const rows = (await sql`
    select id
    from subscribers
    where stripe_customer_id = ${customerId}
    limit 1
  `) as { id: string }[]
  return rows[0]?.id ?? null
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
  assertCan(subscriber, 'marketing_packs')

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

/** Upgrade de assinante já logado (Standard → Pro). */
export async function createProSubscriptionCheckout(
  subscriber: SubscriberRow,
  targetPublicPlan: ProPublicPlanId = 'pro',
): Promise<{ url: string; session_id: string } | null> {
  const offer = getProPlanOffer(targetPublicPlan)
  if (!offer) return null
  const priceId = stripePriceIdForPlan(offer.id)
  if (!priceId || !isStripeConfigured()) return null
  if (subscriber.plan === offer.dbPlan && hasActiveSubscription(subscriber)) {
    throw new Error(`Você já está no plano ${offer.label}`)
  }
  if (offer.id === 'standard' && subscriber.plan === 'pro') {
    throw new Error('Para mudar de Pro para Standard, use o Portal de cobrança')
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
      public_plan: offer.id,
      db_plan: offer.dbPlan,
    },
    subscription_data: {
      metadata: {
        subscriber_id: subscriber.id,
        kind: 'pro_subscription',
        public_plan: offer.id,
        db_plan: offer.dbPlan,
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

  const offer = getProPlanOffer(session.metadata?.public_plan) ?? getProPlanOffer('pro')!
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  const sql = getSql()
  await sql`
    update subscribers
    set plan = ${offer.dbPlan},
        subscription_status = 'active',
        stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
        updated_at = now()
    where id = ${subscriberId}
  `
  return { upgraded: true, subscriber_id: subscriberId, plan: offer.dbPlan }
}

/**
 * Checkout público: paga Standard ou Pro antes de criar a conta.
 * success → /pro/completar-cadastro?session_id=…
 */
export async function createSignupCheckout(input: {
  email: string
  publicPlan: ProPublicPlanId
}): Promise<{ url: string; session_id: string }> {
  const offer = getProPlanOffer(input.publicPlan)
  if (!offer) throw new Error('Plano inválido')
  const priceId = stripePriceIdForPlan(offer.id)
  if (!isStripeConfigured() || !priceId) {
    throw new Error('Pagamento indisponível pra esse plano agora. Tente de novo mais tarde.')
  }

  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('E-mail inválido')
  if (await findSubscriberByEmail(email)) {
    throw new Error('Já existe conta com este e-mail. Faça login e gerencie o plano em Conectar.')
  }

  const stripe = getStripe()
  const base = appBaseUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    success_url: `${base}/pro/completar-cadastro?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/pro/login?checkout=cancel&plan=${offer.id}`,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      kind: 'pro_signup',
      public_plan: offer.id,
      db_plan: offer.dbPlan,
      email,
    },
    subscription_data: {
      metadata: {
        kind: 'pro_signup',
        public_plan: offer.id,
        db_plan: offer.dbPlan,
        email,
      },
    },
  })

  if (!session.url) throw new Error('Stripe não retornou URL de checkout')

  const sql = getSql()
  await sql`
    insert into subscriber_pending_signups (email, plan, stripe_session_id, status)
    values (${email}, ${offer.dbPlan}, ${session.id}, 'awaiting_payment')
    on conflict (stripe_session_id) do nothing
  `

  return { url: session.url, session_id: session.id }
}

export async function markSignupCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== 'pro_signup') return { marked: false }
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  const sql = getSql()
  await sql`
    update subscriber_pending_signups
    set status = 'paid',
        stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
        paid_at = coalesce(paid_at, now())
    where stripe_session_id = ${session.id}
      and status in ('awaiting_payment', 'paid')
  `
  return { marked: true }
}

/** Valida session paga e cria o assinante (completa o cadastro). */
export async function completeSignupFromCheckout(input: {
  sessionId: string
  displayName: string
  password: string
}): Promise<SubscriberRow> {
  if (!isStripeConfigured()) throw new Error('Stripe não configurado')
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(input.sessionId)

  if (session.metadata?.kind !== 'pro_signup') {
    throw new Error('Sessão de checkout inválida')
  }
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    throw new Error('Pagamento ainda não confirmado')
  }

  const email = (session.metadata.email || session.customer_details?.email || '').trim().toLowerCase()
  if (!email.includes('@')) throw new Error('E-mail ausente no checkout')

  const existing = await findSubscriberByEmail(email)
  if (existing) {
    throw new Error('Conta já criada com este e-mail. Faça login.')
  }

  const offer = getProPlanOffer(session.metadata.public_plan) ?? getProPlanOffer('standard')!
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

  const subscriber = await createSubscriber({
    displayName: input.displayName,
    email,
    password: input.password,
    plan: offer.dbPlan,
    subscription_status: 'active',
    stripeCustomerId: customerId,
  })

  if (customerId) {
    await stripe.customers.update(customerId, {
      metadata: { subscriber_id: subscriber.id },
    })
  }

  const sql = getSql()
  await sql`
    update subscriber_pending_signups
    set status = 'completed',
        subscriber_id = ${subscriber.id},
        stripe_customer_id = coalesce(${customerId}, stripe_customer_id),
        completed_at = now(),
        paid_at = coalesce(paid_at, now())
    where stripe_session_id = ${session.id}
  `

  // Liga metadata da subscription ao subscriber (upgrade futuro / cancelamento)
  const subRef = session.subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (subId) {
    await stripe.subscriptions.update(subId, {
      metadata: {
        kind: 'pro_subscription',
        subscriber_id: subscriber.id,
        public_plan: offer.id,
        db_plan: offer.dbPlan,
      },
    })
  }

  return subscriber
}

export async function getSignupCheckoutPreview(sessionId: string): Promise<{
  email: string
  plan: ProPublicPlanId
  plan_label: string
  price_label: string
  paid: boolean
}> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.kind !== 'pro_signup') {
    throw new Error('Sessão inválida')
  }
  const offer = getProPlanOffer(session.metadata.public_plan) ?? getProPlanOffer('standard')!
  const email = (session.metadata.email || session.customer_details?.email || '').trim().toLowerCase()
  const paid = session.payment_status === 'paid' || session.status === 'complete'
  return {
    email,
    plan: offer.id,
    plan_label: offer.label,
    price_label: offer.priceLabel,
    paid,
  }
}

/** Features padrão do Customer Portal (HairSales / Pro). */
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
    headline: 'HairSales — gerencie sua assinatura',
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
