import { getSql } from '@/lib/db'
import type { SubscriberRow } from '@/lib/pro/subscribers'
import { createMarketingPackCheckout, isStripeConfigured } from '@/lib/pro/stripe'
import {
  getMarketingPack,
  listMarketingPacks,
  type MarketingPack,
} from '@/lib/pro/pack-catalog'

export type { MarketingPack }
export { getMarketingPack, listMarketingPacks }

function allowDemoPurchase() {
  return (
    process.env.PRO_ALLOW_PACK_PURCHASE === '1' ||
    process.env.PRO_ALLOW_PACK_PURCHASE === 'true' ||
    process.env.PRO_ALLOW_SELF_UPGRADE === '1' ||
    process.env.NODE_ENV !== 'production'
  )
}

export type PurchaseResult =
  | {
      mode: 'stripe'
      checkout_url: string
      session_id: string
      pack: MarketingPack
    }
  | {
      mode: 'demo'
      credits_added: number
      marketing_credits: number
      pack: MarketingPack
    }

/**
 * Compra pack: Stripe Checkout se STRIPE_SECRET_KEY; senão demo (dev / flag).
 */
export async function purchaseMarketingPack(
  subscriber: SubscriberRow,
  packId: string,
): Promise<PurchaseResult> {
  if (subscriber.plan !== 'pro') {
    throw new Error('Packs de marketing estão no plano Pro.')
  }

  const pack = getMarketingPack(packId)
  if (!pack) throw new Error('Pack inválido')

  if (isStripeConfigured()) {
    const checkout = await createMarketingPackCheckout(subscriber, packId)
    return {
      mode: 'stripe',
      checkout_url: checkout.url,
      session_id: checkout.session_id,
      pack: checkout.pack,
    }
  }

  if (!allowDemoPurchase()) {
    throw new Error('Configure STRIPE_SECRET_KEY ou PRO_ALLOW_PACK_PURCHASE para comprar packs')
  }

  return creditDemoPack(subscriber, pack)
}

async function creditDemoPack(subscriber: SubscriberRow, pack: MarketingPack) {
  const sql = getSql()
  const updated = (await sql`
    update subscribers
    set marketing_credits = coalesce(marketing_credits, 0) + ${pack.credits},
        updated_at = now()
    where id = ${subscriber.id}
    returning marketing_credits
  `) as { marketing_credits: number }[]

  await sql`
    insert into subscriber_whatsapp_pack_purchases (
      subscriber_id, pack_id, credits, amount_cents, status, provider
    ) values (
      ${subscriber.id}, ${pack.id}, ${pack.credits}, ${pack.amount_cents}, 'completed', 'demo'
    )
  `

  return {
    mode: 'demo' as const,
    credits_added: pack.credits,
    marketing_credits: updated[0]?.marketing_credits ?? pack.credits,
    pack,
  }
}

export async function listPackPurchases(subscriberId: string) {
  const sql = getSql()
  return (await sql`
    select id, pack_id, credits, amount_cents, status, provider, stripe_session_id, created_at
    from subscriber_whatsapp_pack_purchases
    where subscriber_id = ${subscriberId}
    order by created_at desc
    limit 20
  `) as Array<{
    id: string
    pack_id: string
    credits: number
    amount_cents: number | null
    status: string
    provider: string
    stripe_session_id: string | null
    created_at: string
  }>
}

export async function getMarketingCredits(subscriberId: string): Promise<number> {
  const sql = getSql()
  const rows = (await sql`
    select coalesce(marketing_credits, 0)::int as marketing_credits
    from subscribers where id = ${subscriberId} limit 1
  `) as { marketing_credits: number }[]
  return rows[0]?.marketing_credits ?? 0
}

export async function decrementMarketingCredit(subscriberId: string): Promise<boolean> {
  const sql = getSql()
  const rows = (await sql`
    update subscribers
    set marketing_credits = marketing_credits - 1, updated_at = now()
    where id = ${subscriberId} and marketing_credits > 0
    returning marketing_credits
  `) as { marketing_credits: number }[]
  return rows.length > 0
}

export async function incrementMarketingCredit(subscriberId: string) {
  const sql = getSql()
  await sql`
    update subscribers
    set marketing_credits = coalesce(marketing_credits, 0) + 1, updated_at = now()
    where id = ${subscriberId}
  `
}
