import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { isCronAuthorized } from '@/lib/cron-auth'
import { isProduction } from '@/lib/env'
import { runProAppointmentReminders } from '@/lib/pro/reminders'

export const maxDuration = 120

async function authorize(req: NextRequest) {
  if (isCronAuthorized(req)) return true
  if (!process.env.CRON_SECRET?.trim() && !isProduction()) return true
  return false
}

export async function GET(req: NextRequest) {
  try {
    if (!(await authorize(req))) return err('Não autorizado', 401)
    const hours = Number(req.nextUrl.searchParams.get('hours') || 24)
    const result = await runProAppointmentReminders(
      Number.isFinite(hours) && hours > 0 ? Math.min(hours, 72) : 24,
    )
    return ok(result)
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
