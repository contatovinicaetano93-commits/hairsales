import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { requireProSession } from '@/lib/pro/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const filter = req.nextUrl.searchParams.get('filter') || 'all'
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
    const sql = getSql()
    const sid = auth.session.subscriber.id

    let rows = (await sql`
      select id, name, phone, status, last_visit_at, last_service_name, last_price, updated_at
      from subscriber_clients
      where subscriber_id = ${sid}
      order by coalesce(last_visit_at, updated_at) desc nulls last
      limit 200
    `) as Array<{
      id: string
      name: string | null
      phone: string | null
      status: string
      last_visit_at: string | null
      last_service_name: string | null
      last_price: number | null
      updated_at: string
    }>

    if (filter === 'hot') {
      rows = rows.filter((r) => r.status === 'novo' || r.status === 'em_atendimento')
    } else if (filter === 'reactivation') {
      const cutoff = Date.now() - 45 * 86_400_000
      rows = rows.filter((r) => r.last_visit_at && new Date(r.last_visit_at).getTime() < cutoff)
    }

    if (q) {
      rows = rows.filter(
        (r) =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.phone && r.phone.includes(q)),
      )
    }

    return ok({ clients: rows })
  } catch (e) {
    return handleError(e)
  }
}
