import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { EntitlementError } from '@/lib/pro/entitlements'
import {
  listMarketingPacks,
  listPackPurchases,
  purchaseMarketingPack,
} from '@/lib/pro/whatsapp-packs'
import { getWhatsappUsage } from '@/lib/pro/whatsapp-cloud'
import { isStripeConfigured } from '@/lib/pro/stripe'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const usage = await getWhatsappUsage(
      auth.session.subscriber.id,
      auth.session.subscriber.plan,
    )
    const purchases = await listPackPurchases(auth.session.subscriber.id)
    return ok({
      packs: listMarketingPacks(),
      usage,
      purchases,
      stripe_enabled: isStripeConfigured(),
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const body = await req.json().catch(() => null)
    const packId = typeof body?.pack_id === 'string' ? body.pack_id : ''
    if (!packId) return err('Selecione um pacote de créditos', 400)

    const result = await purchaseMarketingPack(auth.session.subscriber, packId)
    const usage = await getWhatsappUsage(
      auth.session.subscriber.id,
      auth.session.subscriber.plan,
    )
    return ok({ ...result, usage })
  } catch (e) {
    if (e instanceof EntitlementError) return err(e.message, 403)
    return handleError(e)
  }
}
