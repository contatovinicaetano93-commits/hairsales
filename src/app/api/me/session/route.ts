import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { requireProSession } from '@/lib/pro/auth'
import { getActiveConnection } from '@/lib/pro/subscribers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const conn = await getActiveConnection(auth.session.subscriber.id)
    return ok({
      subscriber: {
        id: auth.session.subscriber.id,
        display_name: auth.session.subscriber.display_name,
        email: auth.session.subscriber.email,
        plan: auth.session.subscriber.plan,
        subscription_status: auth.session.subscriber.subscription_status,
      },
      connection: conn
        ? {
            provider: conn.provider,
            status: conn.status,
            professional_name: conn.professional_name_matched,
            last_sync_at: conn.last_sync_at,
            last_error: conn.last_error,
          }
        : null,
    })
  } catch (e) {
    return handleError(e)
  }
}
