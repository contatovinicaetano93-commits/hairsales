import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { getQuotaStatus } from '@/lib/pro/quotas'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const status = await getQuotaStatus(auth.session.subscriber.id, auth.session.subscriber.plan)
    return ok(status)
  } catch (e) {
    return handleError(e)
  }
}
