import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { generateMorningBriefing } from '@/lib/pro/briefing'
import { pushBriefingToTelegram } from '@/lib/pro/telegram'
import { getQuotaStatus } from '@/lib/pro/quotas'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const body = await req.json().catch(() => ({}))
    const pushTelegram = body?.push_telegram === true

    const result = await generateMorningBriefing(auth.session.subscriber)
    let telegram: { sent: boolean; reason?: string } | null = null
    if (pushTelegram) {
      telegram = await pushBriefingToTelegram(auth.session.subscriber, result.briefing)
    }

    const quotas = await getQuotaStatus(auth.session.subscriber.id, auth.session.subscriber.plan)
    return ok({ ...result, telegram, quotas })
  } catch (e) {
    return handleError(e)
  }
}
