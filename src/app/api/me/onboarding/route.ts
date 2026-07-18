import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { buildOnboardingStatus } from '@/lib/pro/onboarding'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)
    const status = await buildOnboardingStatus(auth.session.subscriber)
    return ok(status)
  } catch (e) {
    return handleError(e)
  }
}
