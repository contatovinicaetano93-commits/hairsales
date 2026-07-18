import { getSql } from '@/lib/db'
import type { SubscriberRow } from '@/lib/pro/subscribers'

export interface MarketingPack {
  id: string
  credits: number
  label: string
  /** Preço demo em centavos BRL — billing real depois. */
  amount_cents: number
}

export const MARKETING_PACKS: MarketingPack[] = [
  { id: 'mkt_50', credits: 50, label: '50 mensagens', amount_cents: 2900 },
  { id: 'mkt_100', credits: 100, label: '100 mensagens', amount_cents: 4900 },
  { id: 'mkt_250', credits: 250, label: '250 mensagens', amount_cents: 9900 },
]

export function listMarketingPacks() {
  return MARKETING_PACKS
}

export function getMarketingPack(packId: string): MarketingPack | null {
  return MARKETING_PACKS.find((p) => p.id === packId) ?? null
}

function allowDemoPurchase() {
  return (
    process.env.PRO_ALLOW_PACK_PURCHASE === '1' ||
    process.env.PRO_ALLOW_PACK_PURCHASE === 'true' ||
    process.env.PRO_ALLOW_SELF_UPGRADE === '1' ||
    process.env.NODE_ENV !== 'production'
  )
}

/** Compra demo de pack — sem Stripe ainda; em prod exige flag. */
export async function purchaseMarketingPack(
  subscriber: SubscriberRow,
  packId: string,
): Promise<{ credits_added: number; marketing_credits: number; pack: MarketingPack }> {
  if (subscriber.plan !== 'pro') {
    throw new Error('Packs de marketing estão no plano Pro.')
  }
  if (!allowDemoPurchase()) {
    throw new Error('Compra de packs indisponível neste ambiente')
  }

  const pack = getMarketingPack(packId)
  if (!pack) throw new Error('Pack inválido')

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
      subscriber_id, pack_id, credits, amount_cents, status
    ) values (
      ${subscriber.id}, ${pack.id}, ${pack.credits}, ${pack.amount_cents}, 'completed'
    )
  `

  return {
    credits_added: pack.credits,
    marketing_credits: updated[0]?.marketing_credits ?? pack.credits,
    pack,
  }
}

export async function listPackPurchases(subscriberId: string) {
  const sql = getSql()
  return (await sql`
    select id, pack_id, credits, amount_cents, status, created_at
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
