import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { requireProSession } from '@/lib/pro/auth'
import { findSubscriberById, type SubscriberPlan } from '@/lib/pro/subscribers'

function allowSelfUpgrade() {
  return (
    process.env.PRO_ALLOW_SELF_UPGRADE === '1' ||
    process.env.PRO_ALLOW_SELF_UPGRADE === 'true' ||
    process.env.NODE_ENV !== 'production'
  )
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    return ok({
      plan: auth.session.subscriber.plan,
      self_upgrade_allowed: allowSelfUpgrade(),
    })
  } catch (e) {
    return handleError(e)
  }
}

/** Upgrade/downgrade para demo — em produção só com PRO_ALLOW_SELF_UPGRADE=1. */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    if (!allowSelfUpgrade()) {
      return err('Upgrade de plano indisponível neste ambiente', 403)
    }

    const body = await req.json().catch(() => null)
    const plan = body?.plan as SubscriberPlan
    if (plan !== 'free' && plan !== 'pro') return err('plan deve ser free ou pro', 400)

    const sql = getSql()
    await sql`
      update subscribers set plan = ${plan}, updated_at = now()
      where id = ${auth.session.subscriber.id}
    `
    const updated = await findSubscriberById(auth.session.subscriber.id)
    return ok({ plan: updated?.plan ?? plan })
  } catch (e) {
    return handleError(e)
  }
}
