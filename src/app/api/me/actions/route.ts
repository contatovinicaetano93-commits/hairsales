import { NextRequest } from 'next/server'
import { ok, err, handleError } from '@/lib/api-response'
import { getSql } from '@/lib/db'
import { requireProSession } from '@/lib/pro/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireProSession(req)
    if (!auth.ok) return err(auth.message, auth.status)

    const sql = getSql()
    const sid = auth.session.subscriber.id
    const daysParam = Number(req.nextUrl.searchParams.get('days') || 45)
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 45

    const reactivation = (await sql`
      select id, name, phone, last_visit_at, last_service_name, last_price
      from subscriber_clients
      where subscriber_id = ${sid}
        and last_visit_at is not null
        and last_visit_at < now() - (${days}::int || ' days')::interval
      order by last_visit_at asc
      limit 50
    `) as Array<{
      id: string
      name: string | null
      phone: string | null
      last_visit_at: string
      last_service_name: string | null
      last_price: number | null
    }>

    const upsell = (await sql`
      select c.id as client_id, c.name as client_name, c.phone,
        s.name as service_name, s.last_done_at, s.cadence_days, s.last_price
      from subscriber_services s
      join subscriber_clients c on c.id = s.client_id
      where s.subscriber_id = ${sid}
        and s.active = true
        and s.last_done_at is not null
        and s.cadence_days is not null
        and s.last_done_at + (s.cadence_days || ' days')::interval <= now() + interval '7 days'
      order by s.last_done_at asc
      limit 50
    `) as Array<{
      client_id: string
      client_name: string | null
      phone: string | null
      service_name: string
      last_done_at: string
      cadence_days: number
      last_price: number | null
    }>

    return ok({
      reactivation: reactivation.map((r) => ({
        ...r,
        days_gone: Math.floor((Date.now() - new Date(r.last_visit_at).getTime()) / 86_400_000),
      })),
      upsell,
    })
  } catch (e) {
    return handleError(e)
  }
}
