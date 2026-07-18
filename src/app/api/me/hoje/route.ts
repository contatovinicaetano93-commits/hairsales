import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { buildProHoje } from '@/lib/pro/hoje'
import { getActiveConnection } from '@/lib/pro/subscribers'
import { syncSubscriberConnection } from '@/lib/pro/sync'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const refresh = req.nextUrl.searchParams.get('refresh') === '1'
    if (refresh) {
      const conn = await getActiveConnection(auth.session.subscriber.id)
      if (conn) await syncSubscriberConnection(conn).catch(() => {})
    }

    const payload = await buildProHoje(auth.session.subscriber)
    return ok(payload)
  } catch (e) {
    return handleError(e)
  }
}
